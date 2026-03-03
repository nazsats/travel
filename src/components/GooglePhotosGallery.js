'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, FolderOpen, RefreshCw } from 'lucide-react';

export function GooglePhotosGallery() {
    const { data: session } = useSession();
    const [photos, setPhotos] = useState([]);
    const [albums, setAlbums] = useState([]);
    const [activeAlbumId, setActiveAlbumId] = useState('all');
    const [lightbox, setLightbox] = useState(null);
    const [loading, setLoading] = useState(true);

    // Subscribe to Firestore — real-time updates when new photos are uploaded
    useEffect(() => {
        if (!session?.user?.email) return;
        setLoading(true);

        // Simple query with just where — no composite index needed
        const q = query(
            collection(db, 'google_photos'),
            where('uploadedBy', '==', session.user.email)
        );

        const unsub = onSnapshot(q, (snap) => {
            // Sort client-side by createdAt descending
            const allPhotos = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => {
                    const ta = a.createdAt?.toMillis?.() || 0;
                    const tb = b.createdAt?.toMillis?.() || 0;
                    return tb - ta;
                });

            setPhotos(allPhotos);

            // Build unique album list from photos
            const albumMap = new Map();
            allPhotos.forEach(p => {
                if (p.albumId && !albumMap.has(p.albumId)) {
                    albumMap.set(p.albumId, { id: p.albumId, title: p.albumTitle || 'Untitled Album', count: 0 });
                }
                if (p.albumId) albumMap.get(p.albumId).count++;
            });
            setAlbums([...albumMap.values()]);
            setLoading(false);
        }, (err) => {
            console.error('Firestore error:', err);
            setLoading(false);
        });

        return () => unsub();
    }, [session]);

    // Keyboard nav
    useEffect(() => {
        if (lightbox === null) return;
        const handler = (e) => {
            const visible = activePhotos;
            if (e.key === 'ArrowRight') setLightbox(i => Math.min(i + 1, visible.length - 1));
            if (e.key === 'ArrowLeft') setLightbox(i => Math.max(i - 1, 0));
            if (e.key === 'Escape') setLightbox(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!session) return null;

    const activePhotos = activeAlbumId === 'all'
        ? photos
        : photos.filter(p => p.albumId === activeAlbumId);

    const lightboxPhoto = lightbox !== null ? activePhotos[lightbox] : null;
    const activeAlbumTitle = activeAlbumId === 'all'
        ? 'All Photos'
        : (albums.find(a => a.id === activeAlbumId)?.title || 'Album');

    return (
        <div style={{ width: '100%' }}>
            {/* ── Header ──────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{ fontFamily: 'Caveat, cursive', fontSize: '1.8rem', fontWeight: 700, color: '#f0e6d0', lineHeight: 1.1 }}>
                        📸 {activeAlbumTitle}
                    </h3>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a', fontSize: '0.85rem', marginTop: '2px' }}>
                        {loading ? 'Loading...' : activePhotos.length > 0
                            ? `${activePhotos.length} photo${activePhotos.length !== 1 ? 's' : ''} — click to enlarge`
                            : 'No photos yet'}
                    </p>
                </div>
                <div style={{ flex: 1 }} />
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#d4a017', fontFamily: 'Caveat, cursive', fontSize: '0.95rem' }}>
                        <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading...
                    </div>
                )}
            </div>

            {/* ── Album Tabs ───────────────────────── */}
            {albums.length > 0 && (
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap',
                    marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #2a2a38',
                }}>
                    {/* All Photos tab */}
                    <button
                        onClick={() => setActiveAlbumId('all')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                            border: `2px solid ${activeAlbumId === 'all' ? '#d4a017' : '#2a2a38'}`,
                            background: activeAlbumId === 'all' ? 'rgba(212,160,23,0.12)' : '#13131c',
                            color: activeAlbumId === 'all' ? '#f5d56e' : '#b8a88a',
                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                            transition: 'all 0.18s',
                            boxShadow: activeAlbumId === 'all' ? '0 0 10px rgba(212,160,23,0.15)' : 'none',
                        }}
                    >
                        📷 All ({photos.length})
                    </button>

                    {albums.map(album => {
                        const isActive = activeAlbumId === album.id;
                        return (
                            <button
                                key={album.id}
                                onClick={() => setActiveAlbumId(album.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '999px', cursor: 'pointer',
                                    border: `2px solid ${isActive ? '#d4a017' : '#2a2a38'}`,
                                    background: isActive ? 'rgba(212,160,23,0.12)' : '#13131c',
                                    color: isActive ? '#f5d56e' : '#b8a88a',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                                    transition: 'all 0.18s',
                                    boxShadow: isActive ? '0 0 10px rgba(212,160,23,0.15)' : 'none',
                                }}
                            >
                                <FolderOpen size={12} /> {album.title}
                                <span style={{ fontSize: '0.7rem', color: '#7a6f5a' }}>({album.count})</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Loading skeleton ──────────────────── */}
            {loading && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} style={{
                            height: '160px', borderRadius: '14px',
                            background: 'linear-gradient(110deg, #1a1a24 30%, #2a2a38 50%, #1a1a24 70%)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 1.4s ease-in-out infinite',
                            border: '1.5px solid #2a2a38',
                        }} />
                    ))}
                </div>
            )}

            {/* ── Empty state ───────────────────────── */}
            {!loading && activePhotos.length === 0 && (
                <div style={{
                    textAlign: 'center', padding: '48px 24px',
                    background: '#111118', border: '2px dashed rgba(212,160,23,0.2)',
                    borderRadius: '20px',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📷</div>
                    <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem', color: '#f5d56e', fontWeight: 700, marginBottom: '6px' }}>
                        {photos.length === 0 ? 'No photos yet!' : 'No photos in this album'}
                    </p>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a', fontSize: '0.9rem', lineHeight: 1.65 }}>
                        {photos.length === 0
                            ? 'Upload a photo above to get started 📸'
                            : 'Upload more photos and select this album ☝️'}
                    </p>
                </div>
            )}

            {/* ── Photo Grid ────────────────────────── */}
            {!loading && activePhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' }}>
                    {activePhotos.map((photo, idx) => (
                        <PhotoTile key={photo.id} photo={photo} onClick={() => setLightbox(idx)} />
                    ))}
                </div>
            )}

            {/* ── Lightbox ──────────────────────────── */}
            {lightboxPhoto && (
                <Lightbox
                    photo={lightboxPhoto}
                    idx={lightbox}
                    total={activePhotos.length}
                    onClose={() => setLightbox(null)}
                    onPrev={() => setLightbox(i => Math.max(i - 1, 0))}
                    onNext={() => setLightbox(i => Math.min(i + 1, activePhotos.length - 1))}
                />
            )}

            <style>{`
                @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
                @keyframes spin { to{transform:rotate(360deg);} }
                @keyframes lb-in { from{opacity:0;}to{opacity:1;} }
                @keyframes img-in { from{opacity:0;transform:scale(0.93);}to{opacity:1;transform:scale(1);} }
            `}</style>
        </div>
    );
}

// ── Photo Tile ────────────────────────────────────────────────
function PhotoTile({ photo, onClick }) {
    const [hovered, setHovered] = useState(false);
    // Use Firebase Storage URL (permanent) — falls back to Google Photos baseUrl
    const src = photo.firebaseUrl || (photo.baseUrl ? `${photo.baseUrl}=w400-h400-c` : null);

    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative', borderRadius: '14px', overflow: 'hidden',
                border: `2px solid ${hovered ? '#d4a017' : '#2a2a38'}`,
                boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.4), 0 0 15px rgba(212,160,23,0.12)' : '0 4px 12px rgba(0,0,0,0.3)',
                cursor: 'pointer',
                transform: hovered ? 'translate(-2px,-2px) rotate(-0.5deg)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                aspectRatio: '1 / 1',
                background: '#1a1a24',
            }}
        >
            {src ? (
                <img
                    src={src}
                    alt={photo.filename || 'Photo'}
                    loading="lazy"
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        display: 'block', transition: 'transform 0.3s',
                        transform: hovered ? 'scale(1.06)' : 'scale(1)',
                    }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                />
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '2rem' }}>📷</div>
            )}
            <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
            }}>
                <ZoomIn size={24} color="#d4a017" />
            </div>
            {photo.albumTitle && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '5px 8px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    fontSize: '0.68rem', fontFamily: 'Caveat, cursive', fontWeight: 600,
                    color: 'rgba(240,230,208,0.9)',
                    opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
                }}>
                    📁 {photo.albumTitle}
                </div>
            )}
        </div>
    );
}

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ photo, idx, total, onClose, onPrev, onNext }) {
    // Use Firebase Storage URL (permanent) — falls back to Google Photos baseUrl
    const src = photo.firebaseUrl || (photo.baseUrl ? `${photo.baseUrl}=w1200` : null);

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 500,
                background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px', animation: 'lb-in 0.2s ease-out',
            }}
        >
            <button onClick={onClose} style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 510,
            }}>
                <X size={18} color="#f0e6d0" />
            </button>

            {idx > 0 && (
                <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 510,
                }}>
                    <ChevronLeft size={22} color="#f0e6d0" />
                </button>
            )}

            <div style={{
                maxWidth: '900px', width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                animation: 'img-in 0.3s ease-out',
            }}>
                {src ? (
                    <img
                        src={src}
                        alt={photo.filename || 'Photo'}
                        style={{
                            maxWidth: '100%', maxHeight: 'calc(100vh - 160px)',
                            objectFit: 'contain', borderRadius: '16px',
                            border: '2px solid rgba(212,160,23,0.3)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 30px rgba(212,160,23,0.1)',
                        }}
                    />
                ) : (
                    <div style={{ padding: '80px', fontSize: '4rem' }}>📷</div>
                )}

                <div style={{
                    background: '#13131c', border: '2px solid rgba(212,160,23,0.2)',
                    borderRadius: '14px', padding: '10px 18px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'center',
                }}>
                    <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem', color: '#f0e6d0' }}>
                        📷 {photo.filename || 'Photo'}
                    </span>
                    {photo.albumTitle && (
                        <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#d4a017' }}>
                            📁 {photo.albumTitle}
                        </span>
                    )}
                    <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#7a6f5a' }}>
                        {idx + 1} / {total}
                    </span>
                    {photo.productUrl && (
                        <a
                            href={photo.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '4px 12px', borderRadius: '999px',
                                border: '2px solid #d4a017', background: 'rgba(212,160,23,0.12)',
                                fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem',
                                color: '#f5d56e', textDecoration: 'none',
                            }}
                        >
                            <Download size={12} /> View in Google Photos
                        </a>
                    )}
                </div>
            </div>

            {idx < total - 1 && (
                <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
                    position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 510,
                }}>
                    <ChevronRight size={22} color="#f0e6d0" />
                </button>
            )}
        </div>
    );
}
