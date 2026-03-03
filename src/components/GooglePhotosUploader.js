"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, UploadCloud, RefreshCw, CheckCircle, AlertCircle, Plus, FolderOpen, ChevronDown } from "lucide-react";

export function GooglePhotosUploader() {
    const { data: session, status } = useSession();
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);

    /* Album state */
    const [albums, setAlbums] = useState([]);
    const [albumsLoading, setAlbumsLoading] = useState(false);
    const [selectedAlbum, setSelectedAlbum] = useState("new");
    const [newAlbumTitle, setNewAlbumTitle] = useState("My Trip");
    const [showAlbumDrop, setShowAlbumDrop] = useState(false);

    /* Load existing albums when signed in */
    useEffect(() => {
        if (!session?.accessToken) return;
        setAlbumsLoading(true);
        fetch("/api/google-albums")
            .then(r => r.json())
            .then(d => { setAlbums(d.albums || []); setAlbumsLoading(false); })
            .catch(() => setAlbumsLoading(false));
    }, [session]);

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) { setFile(f); setMessage(null); }
    };
    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f?.type.startsWith("image/")) { setFile(f); setMessage(null); }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true); setMessage(null);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("albumMode", selectedAlbum);
        if (selectedAlbum === "new") fd.append("albumTitle", newAlbumTitle || "My Trip");
        else if (selectedAlbum !== "none") fd.append("albumId", selectedAlbum);
        try {
            const res = await fetch("/api/upload-google-photo", { method: "POST", body: fd });
            const data = await res.json();
            if (res.ok) {
                setMessage({ type: "success", text: "✅ Photo uploaded to Google Photos!" });
                setFile(null);
                const el = document.getElementById("gp-upload");
                if (el) el.value = "";
                if (selectedAlbum === "new" && data.albumId) {
                    setAlbums(prev => [{ id: data.albumId, title: newAlbumTitle }, ...prev]);
                    setSelectedAlbum(data.albumId);
                }
            } else {
                setMessage({ type: "error", text: data.error || "Upload failed." });
            }
        } catch {
            setMessage({ type: "error", text: "Network error. Please check your connection." });
        } finally {
            setUploading(false);
        }
    };

    const selectedLabel = selectedAlbum === "new" ? `📁 New: "${newAlbumTitle}"`
        : selectedAlbum === "none" ? "No album"
            : albums.find(a => a.id === selectedAlbum)?.title || "Unknown album";

    const sketchInput = {
        background: '#111118', border: '2px solid #2a2a38',
        borderRadius: '12px', color: '#f0e6d0', fontSize: '0.95rem',
        fontFamily: 'Patrick Hand, sans-serif', padding: '10px 13px',
        width: '100%', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        outline: 'none',
    };

    /* Loading skeleton */
    if (status === "loading") return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[75, 55, 90].map((w, i) => (
                <div key={i} style={{
                    height: "14px", borderRadius: "7px",
                    background: "linear-gradient(110deg,#1a1a24 30%,#2a2a38 50%,#1a1a24 70%)",
                    backgroundSize: "200% 100%", width: `${w}%`,
                    animation: "shimmer 1.4s ease-in-out infinite",
                    border: '1px solid #2a2a38',
                }} />
            ))}
            <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
        </div>
    );

    /* Not signed in */
    if (!session) return (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", padding: "8px 0" }}>
            <div style={{ fontSize: "3rem" }}>📷</div>
            <div>
                <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1.3rem", color: "#f0e6d0", marginBottom: "6px" }}>
                    Connect Google Photos
                </p>
                <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.9rem", color: "#7a6f5a", lineHeight: 1.65 }}>
                    Sign in to upload & organise<br />your travel photos in albums.
                </p>
            </div>
            <button
                onClick={() => signIn("google")}
                style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "12px 22px", borderRadius: "999px",
                    background: "linear-gradient(135deg, rgba(212,160,23,0.15), rgba(212,160,23,0.05))",
                    color: "#f0e6d0",
                    border: "2px solid #d4a017",
                    fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem",
                    cursor: "pointer", boxShadow: "0 0 15px rgba(212,160,23,0.15)",
                    transition: "all .2s",
                }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = "0 0 25px rgba(212,160,23,0.25)"; e.currentTarget.style.transform = "translate(-1px,-2px)"; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = "0 0 15px rgba(212,160,23,0.15)"; e.currentTarget.style.transform = ""; }}
            >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
            </button>
        </div>
    );

    /* Signed in */
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <style>{`
                @keyframes spin { to{transform:rotate(360deg);} }
                @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }
                .gp-album-opt { width:100%;padding:10px 14px;text-align:left;background:transparent;border:none;
                  border-bottom:1px solid #2a2a38;color:#f0e6d0;font-size:0.92rem;cursor:pointer;font-family:'Patrick Hand',sans-serif;
                  display:flex;align-items:center;gap:8px;transition:background .15s; }
                .gp-album-opt:hover{ background:rgba(212,160,23,0.1); }
                .gp-album-opt.active{ background:rgba(212,160,23,0.15);font-weight:700; }
            `}</style>

            {/* Connected user row */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderRadius: "12px",
                background: "rgba(76,175,80,0.08)", border: "1.5px solid rgba(76,175,80,0.3)",
                boxShadow: "0 0 12px rgba(76,175,80,0.08)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {session.user?.image
                        ? <img src={session.user.image} alt="avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #4caf50" }} />
                        : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(76,175,80,0.15)", border: "2px solid #4caf50", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Caveat, cursive", fontWeight: 700, color: "#4caf50" }}>
                            {session.user?.name?.[0] || "U"}
                        </div>
                    }
                    <div>
                        <p style={{ fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem", color: "#4caf50", lineHeight: 1.2 }}>
                            ✅ Google Photos Connected
                        </p>
                        <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.77rem", color: "#7a6f5a" }}>
                            {session.user?.email}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()} title="Disconnect"
                    style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: "#7a6f5a", padding: "6px", borderRadius: "8px", display: "flex",
                        transition: "all .2s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.color = "#ff5252"; e.currentTarget.style.background = "rgba(255,82,82,0.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "#7a6f5a"; e.currentTarget.style.background = "transparent"; }}
                >
                    <LogOut size={15} />
                </button>
            </div>

            {/* Album selector */}
            <div>
                <label style={{ display: "block", fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem", color: "#d4a017", marginBottom: "7px" }}>
                    📁 Upload to Album
                </label>
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setShowAlbumDrop(v => !v)}
                        style={{
                            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", borderRadius: "12px", cursor: "pointer",
                            background: "#111118", border: "2px solid #2a2a38",
                            color: "#f0e6d0", fontSize: "0.95rem", fontFamily: "Patrick Hand, sans-serif",
                            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.2)", transition: "all .18s",
                        }}
                    >
                        <span>{selectedLabel}</span>
                        <ChevronDown size={14} style={{ opacity: .7, transform: showAlbumDrop ? "rotate(180deg)" : "", transition: "transform .2s", color: '#d4a017' }} />
                    </button>

                    {showAlbumDrop && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                            background: "#13131c", border: "2px solid rgba(212,160,23,0.2)",
                            borderRadius: "14px", overflow: "hidden",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: "220px", overflowY: "auto",
                        }}>
                            <button className="gp-album-opt" onClick={() => { setSelectedAlbum("new"); setShowAlbumDrop(false); }}
                                style={{ color: "#b388ff", fontWeight: 700, fontFamily: "Caveat, cursive", fontSize: "1rem" }}>
                                <Plus size={13} /> ✨ Create New Album
                            </button>
                            <button className="gp-album-opt" onClick={() => { setSelectedAlbum("none"); setShowAlbumDrop(false); }}>
                                📷 No album (Camera Roll)
                            </button>
                            {albumsLoading && (
                                <div style={{ padding: "12px 14px", fontFamily: "Patrick Hand, sans-serif", fontSize: "0.88rem", color: "#7a6f5a" }}>
                                    ⏳ Loading albums...
                                </div>
                            )}
                            {albums.map(a => (
                                <button key={a.id} className={`gp-album-opt ${selectedAlbum === a.id ? 'active' : ''}`}
                                    onClick={() => { setSelectedAlbum(a.id); setShowAlbumDrop(false); }}>
                                    <FolderOpen size={13} style={{ opacity: .7, color: '#d4a017' }} /> {a.title}
                                    {a.itemCount && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#7a6f5a' }}>{a.itemCount} photos</span>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedAlbum === "new" && (
                    <input
                        value={newAlbumTitle}
                        onChange={e => setNewAlbumTitle(e.target.value)}
                        placeholder="Album name, e.g. Japan 2026 🗾"
                        style={{ ...sketchInput, marginTop: "8px" }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#d4a017'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212,160,23,0.25)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = '#2a2a38'; e.currentTarget.style.boxShadow = 'inset 0 2px 6px rgba(0,0,0,0.3)'; }}
                    />
                )}
            </div>

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("gp-upload").click()}
                style={{
                    border: `2px dashed ${dragOver ? '#d4a017' : file ? '#4caf50' : '#3a3a4a'}`,
                    borderRadius: "16px", padding: "22px 14px", textAlign: "center",
                    background: dragOver ? "rgba(212,160,23,0.08)" : file ? "rgba(76,175,80,0.06)" : "#111118",
                    cursor: "pointer", transition: "all .2s",
                    boxShadow: dragOver ? "0 0 20px rgba(212,160,23,0.12)" : "none",
                }}
            >
                <input type="file" id="gp-upload" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
                    {file ? "🖼️" : dragOver ? "⬇️" : "☁️"}
                </div>
                <p style={{
                    fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1.1rem",
                    color: file ? "#4caf50" : "#b8a88a", marginBottom: "3px",
                }}>
                    {file ? file.name : "Drop an image here"}
                </p>
                <p style={{ fontFamily: "Patrick Hand, sans-serif", fontSize: "0.82rem", color: "#7a6f5a" }}>
                    {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "or click to browse"}
                </p>
            </div>

            {/* Upload button */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "12px", borderRadius: "999px",
                    border: "2px solid #d4a017",
                    cursor: file && !uploading ? "pointer" : "not-allowed",
                    fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem",
                    background: !file || uploading ? "#1a1a24" : "linear-gradient(135deg, rgba(212,160,23,0.2), rgba(184,134,11,0.15))",
                    color: !file || uploading ? "#7a6f5a" : "#f5d56e",
                    boxShadow: file && !uploading ? "0 0 15px rgba(212,160,23,0.15)" : "none",
                    transition: "all .2s",
                    opacity: (!file || uploading) ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (file && !uploading) { e.currentTarget.style.transform = 'translate(-1px,-2px)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(212,160,23,0.25)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = file && !uploading ? '0 0 15px rgba(212,160,23,0.15)' : 'none'; }}
            >
                {uploading
                    ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Uploading...</>
                    : <>☁️ Upload to Google Photos</>
                }
            </button>

            {/* Message */}
            {message && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
                    borderRadius: "14px",
                    background: message.type === "success" ? "rgba(76,175,80,0.08)" : "rgba(255,82,82,0.08)",
                    border: `1.5px solid ${message.type === "success" ? "rgba(76,175,80,0.3)" : "rgba(255,82,82,0.3)"}`,
                    color: message.type === "success" ? "#4caf50" : "#ff5252",
                    fontFamily: "Caveat, cursive", fontWeight: 700, fontSize: "1rem",
                    boxShadow: `0 0 12px ${message.type === "success" ? "rgba(76,175,80,0.08)" : "rgba(255,82,82,0.08)"}`,
                }}>
                    {message.text}
                </div>
            )}
        </div>
    );
}
