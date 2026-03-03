'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { RefreshCw, Image as ImageIcon, X, ChevronLeft, ChevronRight, Download, ZoomIn, FolderOpen } from 'lucide-react';

const REFRESH_INTERVAL = 55 * 60 * 1000;

export function GooglePhotosGallery({ albumId: initialAlbumId = null, albumTitle = 'Your Photos' }) {
    const { data: session } = useSession();
    const [photos, setPhotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lightbox, setLightbox] = useState(null);

    // Album tabs
    const [albums, setAlbums] = useState([]);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [activeAlbumId, setActiveAlbumId] = useState(initialAlbumId); // null = all photos

    // Fetch albums
    useEffect(() => {
        if (!session?.accessToken) return;
        setAlbumsLoading(true);
        fetch('/api/google-albums')
            .then(r => r.json())
            .then(d => { setAlbums(d.albums || []); setAlbumsLoading(false); })
            .catch(() => setAlbumsLoading(false));
    }, [session]);

    const fetchPhotos = useCallback(async () => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        try {
            const url = activeAlbumId
                ? `/api/google-photos?albumId=${encodeURIComponent(activeAlbumId)}`
                : '/api/google-photos';
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to load photos');
            setPhotos(data.photos || []);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [session, activeAlbumId]);

    useEffect(() => {
        fetchPhotos();
        const interval = setInterval(fetchPhotos, REFRESH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchPhotos]);

    // Keyboard nav for lightbox
    useEffect(() => {
        if (lightbox === null) return;
        const handler = (e) => {
            if (e.key === 'ArrowRight') setLightbox(i => Math.min(i + 1, photos.length - 1));
            if (e.key === 'ArrowLeft') setLightbox(i => Math.max(i - 1, 0));
            if (e.key === 'Escape') setLightbox(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox, photos.length]);

    if (!session) return null;

    const lightboxPhoto = lightbox !== null ? photos[lightbox] : null;
    const activeAlbumTitle = activeAlbumId ? (albums.find(a => a.id === activeAlbumId)?.title || albumTitle) : 'All Photos';

    return (
        <div style={{ width: '100%' }}>
            {/* ── Section header ─────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div>
                    <h3 style={{
                        fontFamily: 'Caveat, cursive', fontSize: '1.8rem', fontWeight: 700,
                        color: '#f0e6d0', lineHeight: 1.1,
                    }}>
                        📸 {activeAlbumTitle}
                    </h3>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#7a6f5a', fontSize: '0.85rem', marginTop: '2px' }}>
                        {photos.length > 0
                            ? `${photos.length} photo${photos.length !== 1 ? 's' : ''} — click any to enlarge`
                            : 'No photos yet'}
                    </p>
                </div>
                <div style={{ flex: 1 }} />
                <button
                    onClick={fetchPhotos}
                    disabled={loading}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '8px 16px', borderRadius: '999px',
                        border: '2px solid #d4a017',
                        background: 'linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05))',
                        fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.95rem',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 0 12px rgba(212,160,23,0.1)',
                        transition: 'all 0.18s',
                        color: '#f5d56e',
                        opacity: loading ? 0.6 : 1,
                    }}
                    onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(212,160,23,0.2)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 12px rgba(212,160,23,0.1)'; }}
                >
                    <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {/* ── Album Tabs ──────────────────────────────── */}
            {albums.length > 0 && (
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px',
                    paddingBottom: '16px', borderBottom: '1px solid #2a2a38',
                }}>
                    <button
                        onClick={() => setActiveAlbumId(null)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '999px',
                            border: `2px solid ${!activeAlbumId ? '#d4a017' : '#2a2a38'}`,
                            background: !activeAlbumId ? 'rgba(212,160,23,0.12)' : '#13131c',
                            color: !activeAlbumId ? '#f5d56e' : '#b8a88a',
                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                            cursor: 'pointer', transition: 'all 0.18s',
                            boxShadow: !activeAlbumId ? '0 0 10px rgba(212,160,23,0.15)' : 'none',
                        }}
                    >
                        📷 All Photos
                    </button>
                    {albums.map(album => {
                        const isActive = activeAlbumId === album.id;
                        return (
                            <button
                                key={album.id}
                                onClick={() => setActiveAlbumId(album.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '999px',
                                    border: `2px solid ${isActive ? '#d4a017' : '#2a2a38'}`,
                                    background: isActive ? 'rgba(212,160,23,0.12)' : '#13131c',
                                    color: isActive ? '#f5d56e' : '#b8a88a',
                                    fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.92rem',
                                    cursor: 'pointer', transition: 'all 0.18s',
                                    boxShadow: isActive ? '0 0 10px rgba(212,160,23,0.15)' : 'none',
                                }}
                            >
                                {album.coverUrl && (
                                    <img
                                        src={`${album.coverUrl}=w32-h32-c`}
                                        alt=""
                                        style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid #3a3a4a' }}
                                    />
                                )}
                                <FolderOpen size={12} /> {album.title}
                                {album.itemCount && (
                                    <span style={{ fontSize: '0.7rem', color: '#7a6f5a', marginLeft: '2px' }}>({album.itemCount})</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Error ──────────────────────────────────── */}
            {error && (
                <div style={{
                    padding: '12px 16px', borderRadius: '14px', marginBottom: '16px',
                    background: 'rgba(255,82,82,0.08)', border: '1.5px solid rgba(255,82,82,0.3)',
                    color: '#ff5252', fontFamily: 'Caveat, cursive', fontSize: '1rem', fontWeight: 700,
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ── Loading skeleton ───────────────────────── */}
            {loading && photos.length === 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '14px',
                }}>
                    {[...Array(8)].map((_, i) => (
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

            {/* ── Empty state ────────────────────────────── */}
            {!loading && photos.length === 0 && !error && (
                <div style={{
                    textAlign: 'center', padding: '48px 24px',
                    background: '#111118', border: '2px dashed #2a2a38',
                    borderRadius: '20px',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📭</div>
                    <p style={{ fontFamily: 'Caveat, cursive', fontSize: '1.3rem', color: '#7a6f5a', fontWeight: 700 }}>
                        No photos uploaded yet!
                    </p>
                    <p style={{ fontFamily: 'Patrick Hand, sans-serif', color: '#5a4a30', fontSize: '0.9rem', marginTop: '6px' }}>
                        Upload some photos using the form above ☝️
                    </p>
                </div>
            )}

            {/* ── Photo grid ─────────────────────────────── */}
            {photos.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '14px',
                }}>
                    {photos.map((photo, idx) => (
                        <PhotoTile
                            key={photo.id}
                            photo={photo}
                            onClick={() => setLightbox(idx)}
                        />
                    ))}
                </div>
            )}

            {/* ── Lightbox ───────────────────────────────── */}
            {lightboxPhoto && (
                <Lightbox
                    photo={lightboxPhoto}
                    idx={lightbox}
                    total={photos.length}
                    onClose={() => setLightbox(null)}
                    onPrev={() => setLightbox(i => Math.max(i - 1, 0))}
                    onNext={() => setLightbox(i => Math.min(i + 1, photos.length - 1))}
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

// ── Photo tile ───────────────────────────────────────────────
function PhotoTile({ photo, onClick }) {
    const [hovered, setHovered] = useState(false);
    const src = `${photo.baseUrl}=w400-h400-c`;

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
            {/* Overlay on hover */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.2s',
            }}>
                <ZoomIn size={24} color="#d4a017" />
            </div>
            {/* Date label */}
            {photo.creationTime && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '6px 8px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    fontSize: '0.7rem', fontFamily: 'Patrick Hand, sans-serif',
                    color: 'rgba(240,230,208,0.9)',
                    opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
                }}>
                    {new Date(photo.creationTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            )}
        </div>
    );
}

// ── Lightbox ─────────────────────────────────────────────────
function Lightbox({ photo, idx, total, onClose, onPrev, onNext }) {
    const src = `${photo.baseUrl}=w1200`;

    return (
        <div
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            style={{
                position: 'fixed', inset: 0, zIndex: 500,
                background: 'rgba(0,0,0,0.92)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
                animation: 'lb-in 0.2s ease-out',
            }}
        >
            {/* Close */}
            <button onClick={onClose} style={{
                position: 'absolute', top: '20px', right: '20px',
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                boxShadow: '0 0 15px rgba(212,160,23,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 510,
                transition: 'all 0.18s',
            }}>
                <X size={18} color="#f0e6d0" />
            </button>

            {/* Prev */}
            {idx > 0 && (
                <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{
                    position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                    boxShadow: '0 0 15px rgba(212,160,23,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 510,
                }}>
                    <ChevronLeft size={22} color="#f0e6d0" />
                </button>
            )}

            {/* Image + info */}
            <div style={{
                maxWidth: '900px', width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
                animation: 'img-in 0.3s ease-out',
            }}>
                <img
                    src={src}
                    alt={photo.filename || 'Photo'}
                    style={{
                        maxWidth: '100%',
                        maxHeight: 'calc(100vh - 160px)',
                        objectFit: 'contain',
                        borderRadius: '16px',
                        border: '2px solid rgba(212,160,23,0.3)',
                        boxShadow: '0 12px 48px rgba(0,0,0,0.5), 0 0 30px rgba(212,160,23,0.1)',
                    }}
                />
                {/* Caption bar */}
                <div style={{
                    background: '#13131c', border: '2px solid rgba(212,160,23,0.2)',
                    borderRadius: '14px', padding: '10px 18px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    flexWrap: 'wrap', justifyContent: 'center',
                }}>
                    <span style={{ fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '1rem', color: '#f0e6d0' }}>
                        📷 {photo.filename || 'Photo'}
                    </span>
                    {photo.creationTime && (
                        <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.88rem', color: '#b8a88a' }}>
                            📅 {new Date(photo.creationTime).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                    )}
                    <span style={{ fontFamily: 'Patrick Hand, sans-serif', fontSize: '0.82rem', color: '#7a6f5a' }}>
                        {idx + 1} / {total}
                    </span>
                    <a
                        href={`${photo.baseUrl}=d`}
                        download={photo.filename}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '4px 12px', borderRadius: '999px',
                            border: '2px solid #d4a017',
                            background: 'rgba(212,160,23,0.12)',
                            fontFamily: 'Caveat, cursive', fontWeight: 700, fontSize: '0.88rem',
                            color: '#f5d56e', textDecoration: 'none',
                        }}
                    >
                        <Download size={12} /> Download
                    </a>
                </div>
            </div>

            {/* Next */}
            {idx < total - 1 && (
                <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
                    position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: 'rgba(212,160,23,0.15)', border: '2px solid #d4a017',
                    boxShadow: '0 0 15px rgba(212,160,23,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', zIndex: 510,
                }}>
                    <ChevronRight size={22} color="#f0e6d0" />
                </button>
            )}
        </div>
    );
}
