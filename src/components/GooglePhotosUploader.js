"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, UploadCloud, Sparkles, X, Plus, FolderOpen, ChevronDown, CheckCircle } from "lucide-react";

export function GooglePhotosUploader({ onUploadComplete }) {
    const { data: session, status } = useSession();
    const [files, setFiles] = useState([]);          // [{file, preview, progress, status, aiCaption}]
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [allDone, setAllDone] = useState(false);
    const inputRef = useRef(null);

    /* Album state */
    const [albums, setAlbums] = useState([]);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState("new");
    const [newAlbumTitle, setNewAlbumTitle] = useState("");
    const [showAlbumDrop, setShowAlbumDrop] = useState(false);

    useEffect(() => {
        if (!session?.accessToken) return;
        setAlbumsLoading(true);
        fetch("/api/google-albums")
            .then(r => r.json())
            .then(d => { setAlbums(d.albums || []); setAlbumsLoading(false); })
            .catch(() => setAlbumsLoading(false));
    }, [session]);

    // Generate image preview + optional AI caption on add
    const addFiles = async (newFiles) => {
        const added = await Promise.all(Array.from(newFiles).filter(f => f.type.startsWith("image/")).map(async (file) => {
            const preview = URL.createObjectURL(file);
            return { file, preview, progress: 0, status: "pending", aiCaption: null };
        }));
        setFiles(prev => [...prev, ...added]);
        setAllDone(false);
    };

    const removeFile = (idx) => {
        setFiles(prev => {
            URL.revokeObjectURL(prev[idx].preview);
            return prev.filter((_, i) => i !== idx);
        });
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        addFiles(e.dataTransfer.files);
    };

    // AI caption a single image using GPT-4o vision
    const aiCaptionFile = async (idx) => {
        const item = files[idx];
        if (!item || item.aiCaption) return;
        setFiles(prev => prev.map((f, i) => i === idx ? { ...f, aiCaption: "✨ Analyzing..." } : f));
        try {
            const base64 = await fileToBase64(item.file);
            const res = await fetch("/api/ai-caption", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64: base64, mimeType: item.file.type }),
            });
            const data = await res.json();
            setFiles(prev => prev.map((f, i) => i === idx ? { ...f, aiCaption: data.caption || "📷 Beautiful shot!" } : f));
        } catch {
            setFiles(prev => prev.map((f, i) => i === idx ? { ...f, aiCaption: "📷 Photo ready to upload" } : f));
        }
    };

    const handleUpload = async () => {
        if (!files.length || uploading) return;
        setUploading(true);
        setAllDone(false);

        // Determine album params once
        let albumMode = selectedAlbum;
        let albumTitle = newAlbumTitle || "My Trip";
        let createdAlbumId = null;

        for (let i = 0; i < files.length; i++) {
            if (files[i].status === "done") continue;
            setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "uploading", progress: 10 } : f));

            const fd = new FormData();
            fd.append("file", files[i].file);
            fd.append("albumMode", createdAlbumId ? createdAlbumId : albumMode);
            if (albumMode === "new" && !createdAlbumId) fd.append("albumTitle", albumTitle);
            else if (createdAlbumId) { fd.append("albumId", createdAlbumId); fd.set("albumMode", "existing"); }
            else if (albumMode !== "none") fd.append("albumId", selectedAlbum);

            try {
                // Simulate progress while uploading
                const progressInterval = setInterval(() => {
                    setFiles(prev => prev.map((f, idx) => idx === i && f.progress < 85 ? { ...f, progress: f.progress + 15 } : f));
                }, 600);

                const res = await fetch("/api/upload-google-photo", { method: "POST", body: fd });
                clearInterval(progressInterval);
                const data = await res.json();

                if (res.ok) {
                    if (albumMode === "new" && !createdAlbumId && data.albumId) {
                        createdAlbumId = data.albumId;
                        setAlbums(prev => [{ id: data.albumId, title: albumTitle }, ...prev]);
                    }
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "done", progress: 100 } : f));
                } else {
                    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "error", progress: 0 } : f));
                }
            } catch {
                setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, status: "error", progress: 0 } : f));
            }
        }

        setUploading(false);
        setAllDone(true);
        onUploadComplete?.();
    };

    const selectedLabel = selectedAlbum === "new"
        ? `✨ New Album: "${newAlbumTitle || 'My Trip'}"`
        : selectedAlbum === "none" ? "📷 No album (Camera Roll)"
            : albums.find(a => a.id === selectedAlbum)?.title || "Unknown album";

    const pendingCount = files.filter(f => f.status !== "done").length;

    const s = {
        input: {
            background: '#111118', border: '2px solid #2a2a38', borderRadius: '12px',
            color: '#f0e6d0', fontSize: '0.95rem', fontFamily: 'Patrick Hand, sans-serif',
            padding: '10px 13px', width: '100%', outline: 'none', transition: 'all 0.2s',
        },
    };

    if (status === "loading") return <LoadingSkeleton />;

    if (!session) return (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", padding: "8px 0" }}>
            <div style={{ fontSize: "3.5rem" }}>📷</div>
            <div>
                <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1.4rem", color: "#f0e6d0", marginBottom: "6px" }}>
                    Connect Google Photos
                </p>
                <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.9rem", color: "#7a6f5a", lineHeight: 1.65 }}>
                    Sign in to upload & organise<br />your travel photos with AI captions.
                </p>
            </div>
            <GoogleSignInButton onClick={() => signIn("google")} />
        </div>
    );

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
                @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
                @keyframes progressFill { from{width:0}to{width:100%} }
                .album-opt { width:100%;padding:10px 14px;text-align:left;background:transparent;border:none;
                  border-bottom:1px solid rgba(255,255,255,0.05);color:#f0e6d0;font-size:0.92rem;cursor:pointer;
                  font-family:'Patrick Hand',sans-serif;display:flex;align-items:center;gap:8px;transition:background .15s; }
                .album-opt:hover{ background:rgba(212,160,23,0.1); }
                .album-opt.active{ background:rgba(212,160,23,0.15);color:#f5d56e;font-weight:700; }
                .up-input:focus { border-color: #d4a017 !important; box-shadow: 0 0 0 3px rgba(212,160,23,0.2) !important; }
            `}</style>

            {/* ── Connected user row ─── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "14px",
                background: "rgba(76,175,80,0.07)", border: "1.5px solid rgba(76,175,80,0.25)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {session.user?.image
                        ? <img src={session.user.image} alt="avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #4caf50" }} />
                        : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(76,175,80,0.15)", border: "2px solid #4caf50", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Caveat, cursive", fontWeight: 700, color: "#4caf50" }}>{session.user?.name?.[0] || "U"}</div>
                    }
                    <div>
                        <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "0.95rem", color: "#4caf50", lineHeight: 1.2 }}>✅ Connected</p>
                        <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.75rem", color: "#7a6f5a" }}>{session.user?.email}</p>
                    </div>
                </div>
                <button onClick={() => signOut()} title="Sign out" style={{ background: "transparent", border: "none", cursor: "pointer", color: "#7a6f5a", padding: "6px", borderRadius: "8px", display: "flex", transition: "all .2s" }}
                    onMouseOver={e => { e.currentTarget.style.color = "#ff5252"; e.currentTarget.style.background = "rgba(255,82,82,0.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "#7a6f5a"; e.currentTarget.style.background = "transparent"; }}>
                    <LogOut size={15} />
                </button>
            </div>

            {/* ── Album Selector ─────── */}
            <div>
                <label style={{ display: "block", fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem", color: "#d4a017", marginBottom: "7px" }}>
                    📁 Upload to Album
                </label>
                <div style={{ position: "relative" }}>
                    <button type="button" onClick={() => setShowAlbumDrop(v => !v)} style={{
                        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 14px", borderRadius: "12px", cursor: "pointer",
                        background: "#111118", border: "2px solid #2a2a38",
                        color: "#f0e6d0", fontSize: "0.92rem", fontFamily: "Patrick Hand, sans-serif", transition: "all .18s",
                    }}>
                        <span>{selectedLabel}</span>
                        <ChevronDown size={14} style={{ color: '#d4a017', transform: showAlbumDrop ? "rotate(180deg)" : "", transition: "transform .2s" }} />
                    </button>
                    {showAlbumDrop && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                            background: "#13131c", border: "2px solid rgba(212,160,23,0.2)",
                            borderRadius: "14px", overflow: "hidden",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxHeight: "210px", overflowY: "auto",
                        }}>
                            <button className="album-opt" onClick={() => { setSelectedAlbum("new"); setShowAlbumDrop(false); }}
                                style={{ color: "#b388ff", fontFamily: "Caveat, cursive", fontSize: "1rem", fontWeight: 700 }}>
                                <Plus size={13} /> ✨ Create New Album
                            </button>
                            <button className="album-opt" onClick={() => { setSelectedAlbum("none"); setShowAlbumDrop(false); }}>
                                📷 No album (Camera Roll)
                            </button>
                            {albumsLoading && <div style={{ padding: "12px 14px", color: "#7a6f5a", fontFamily: "Patrick Hand, sans-serif", fontSize: "0.88rem" }}>⏳ Loading albums...</div>}
                            {albums.map(a => (
                                <button key={a.id} className={`album-opt ${selectedAlbum === a.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedAlbum(a.id); setShowAlbumDrop(false); }}>
                                    <FolderOpen size={13} style={{ color: '#d4a017' }} /> {a.title}
                                    {a.itemCount && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#7a6f5a' }}>{a.itemCount}</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {selectedAlbum === "new" && (
                    <input className="up-input" value={newAlbumTitle} onChange={e => setNewAlbumTitle(e.target.value)}
                        placeholder="Album name, e.g. Japan 2026 🗾"
                        style={{ ...s.input, marginTop: "8px" }} />
                )}
            </div>

            {/* ── Drop Zone ─────────── */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                style={{
                    border: `2px dashed ${dragOver ? '#d4a017' : files.length ? '#3a3a5a' : '#2a2a38'}`,
                    borderRadius: "18px", padding: files.length ? "14px" : "28px 14px",
                    textAlign: files.length ? "left" : "center",
                    background: dragOver ? "rgba(212,160,23,0.06)" : "#0d0d14",
                    cursor: "pointer", transition: "all .2s",
                    boxShadow: dragOver ? "0 0 24px rgba(212,160,23,0.1)" : "none",
                }}
            >
                <input ref={inputRef} type="file" accept="image/*" multiple onChange={e => addFiles(e.target.files)} style={{ display: "none" }} />

                {files.length === 0 ? (
                    <>
                        <div style={{ fontSize: "3rem", marginBottom: "10px" }}>{dragOver ? "⬇️" : "☁️"}</div>
                        <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1.15rem", color: "#b8a88a", marginBottom: "4px" }}>
                            Drop photos here
                        </p>
                        <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.82rem", color: "#5a4a30" }}>
                            or click to browse • Multiple photos supported
                        </p>
                    </>
                ) : (
                    /* ── Photo preview grid ── */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px,1fr))", gap: "8px" }}>
                        {files.map((item, idx) => (
                            <div key={idx} style={{
                                position: "relative", borderRadius: "10px", overflow: "hidden",
                                background: "#1a1a24", border: `2px solid ${item.status === 'done' ? '#4caf50' : item.status === 'error' ? '#ff5252' : '#2a2a38'}`,
                                aspectRatio: "1/1", animation: "fadeIn 0.3s ease-out",
                            }}>
                                <img src={item.preview} alt={item.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                {/* Progress bar */}
                                {item.status === "uploading" && (
                                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "#1a1a24" }}>
                                        <div style={{ height: "100%", width: `${item.progress}%`, background: "linear-gradient(90deg,#d4a017,#f5d56e)", transition: "width 0.5s" }} />
                                    </div>
                                )}
                                {/* Status badge */}
                                {item.status === "done" && (
                                    <div style={{ position: "absolute", inset: 0, background: "rgba(76,175,80,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                        <CheckCircle size={22} color="#4caf50" />
                                    </div>
                                )}
                                {/* Remove btn */}
                                {item.status !== "uploading" && item.status !== "done" && (
                                    <button onClick={e => { e.stopPropagation(); removeFile(idx); }} style={{
                                        position: "absolute", top: "3px", right: "3px",
                                        width: "18px", height: "18px", borderRadius: "50%",
                                        background: "rgba(0,0,0,0.8)", border: "none", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
                                    }}>
                                        <X size={10} color="#f0e6d0" />
                                    </button>
                                )}
                                {/* AI caption btn */}
                                {item.status === "pending" && !item.aiCaption && (
                                    <button onClick={e => { e.stopPropagation(); aiCaptionFile(idx); }} title="Get AI caption" style={{
                                        position: "absolute", bottom: "3px", right: "3px",
                                        width: "20px", height: "20px", borderRadius: "50%",
                                        background: "rgba(179,136,255,0.9)", border: "none", cursor: "pointer",
                                        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10,
                                    }}>
                                        <Sparkles size={10} color="#fff" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {/* Add more */}
                        <div onClick={e => { e.stopPropagation(); inputRef.current?.click(); }} style={{
                            borderRadius: "10px", border: "2px dashed #2a2a38", background: "#111118",
                            aspectRatio: "1/1", display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center", gap: "4px",
                            cursor: "pointer", transition: "all 0.2s",
                        }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = '#d4a017'; e.currentTarget.style.background = 'rgba(212,160,23,0.05)'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.background = '#111118'; }}>
                            <Plus size={16} color="#7a6f5a" />
                            <span style={{ fontSize: "0.65rem", fontFamily: "Caveat, cursive", color: "#7a6f5a" }}>Add</span>
                        </div>
                    </div>
                )}
            </div>

            {/* ── AI Captions display ── */}
            {files.some(f => f.aiCaption && f.aiCaption !== "✨ Analyzing...") && (
                <div style={{
                    background: "rgba(179,136,255,0.06)", border: "1.5px solid rgba(179,136,255,0.2)",
                    borderRadius: "14px", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px",
                }}>
                    <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem", color: "#b388ff", marginBottom: "4px" }}>
                        ✨ AI Photo Insights
                    </p>
                    {files.filter(f => f.aiCaption && f.aiCaption !== "✨ Analyzing...").map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                            <img src={f.preview} alt="" style={{ width: "28px", height: "28px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                            <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.85rem", color: "#c8b8f0", lineHeight: 1.5 }}>{f.aiCaption}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Upload Button ──────── */}
            {files.length > 0 && (
                <button onClick={handleUpload} disabled={!pendingCount || uploading} style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    padding: "13px", borderRadius: "999px",
                    background: pendingCount && !uploading
                        ? "linear-gradient(135deg, rgba(212,160,23,0.25), rgba(184,134,11,0.15))"
                        : "#1a1a24",
                    border: "2px solid #d4a017",
                    color: pendingCount && !uploading ? "#f5d56e" : "#7a6f5a",
                    fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1.05rem",
                    cursor: pendingCount && !uploading ? "pointer" : "not-allowed",
                    transition: "all .2s", opacity: (!pendingCount || uploading) ? 0.65 : 1,
                    boxShadow: pendingCount && !uploading ? "0 0 20px rgba(212,160,23,0.2)" : "none",
                }}
                    onMouseEnter={e => { if (pendingCount && !uploading) { e.currentTarget.style.transform = 'translate(-1px,-2px)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(212,160,23,0.3)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = pendingCount && !uploading ? '0 0 20px rgba(212,160,23,0.2)' : 'none'; }}>
                    {uploading
                        ? <><UploadCloud size={16} style={{ animation: "spin 1s linear infinite" }} /> Uploading {files.filter(f => f.status === 'uploading').length > 0 ? `photo ${files.findIndex(f => f.status === 'uploading') + 1} of ${files.length}` : '...'}</>
                        : <><UploadCloud size={16} /> Upload {pendingCount} Photo{pendingCount !== 1 ? 's' : ''} ☁️</>
                    }
                </button>
            )}

            {/* ── Success / Clear ────── */}
            {allDone && files.every(f => f.status === "done") && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: "14px", background: "rgba(76,175,80,0.08)", border: "1.5px solid rgba(76,175,80,0.3)" }}>
                    <span style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem", color: "#4caf50" }}>
                        🎉 All {files.length} photo{files.length !== 1 ? 's' : ''} uploaded!
                    </span>
                    <button onClick={() => { setFiles([]); setAllDone(false); }} style={{
                        background: "transparent", border: "1px solid rgba(76,175,80,0.3)",
                        color: "#4caf50", borderRadius: "8px", padding: "4px 10px", cursor: "pointer",
                        fontFamily: "Patrick Hand, sans-serif", fontSize: "0.82rem",
                    }}>Clear</button>
                </div>
            )}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function GoogleSignInButton({ onClick }) {
    return (
        <button onClick={onClick} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "12px 24px", borderRadius: "999px",
            background: "linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05))",
            border: "2px solid #d4a017", color: "#f0e6d0",
            fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem",
            cursor: "pointer", boxShadow: "0 0 20px rgba(212,160,23,0.15)", transition: "all .2s",
        }}
            onMouseOver={e => { e.currentTarget.style.boxShadow = "0 0 30px rgba(212,160,23,0.3)"; e.currentTarget.style.transform = "translate(-1px,-2px)"; }}
            onMouseOut={e => { e.currentTarget.style.boxShadow = "0 0 20px rgba(212,160,23,0.15)"; e.currentTarget.style.transform = ""; }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
        </button>
    );
}

function LoadingSkeleton() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[75, 55, 90].map((w, i) => (
                <div key={i} style={{
                    height: "14px", borderRadius: "7px", width: `${w}%`,
                    background: "linear-gradient(110deg,#1a1a24 30%,#2a2a38 50%,#1a1a24 70%)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.4s ease-in-out infinite",
                }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        </div>
    );
}
