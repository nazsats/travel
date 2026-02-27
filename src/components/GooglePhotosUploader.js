"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogOut, UploadCloud, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, Plus, FolderOpen, ChevronDown } from "lucide-react";

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
                setMessage({ type: "success", text: "Photo uploaded to Google Photos!" });
                setFile(null);
                const el = document.getElementById("gp-upload");
                if (el) el.value = "";
                // Refresh albums if a new one was created
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

    const selectedLabel = selectedAlbum === "new" ? `✦ New: "${newAlbumTitle}"`
        : selectedAlbum === "none" ? "No album"
            : albums.find(a => a.id === selectedAlbum)?.title || "Unknown album";

    /* Loading skeleton */
    if (status === "loading") return (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[75, 55, 90].map((w, i) => (
                <div key={i} style={{ height: "12px", borderRadius: "6px", background: "rgba(255,255,255,0.07)", width: `${w}%`, animation: "shimmer 1.4s ease-in-out infinite", backgroundImage: "linear-gradient(90deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,.10) 50%,rgba(255,255,255,.04) 100%)", backgroundSize: "200% 100%" }} />
            ))}
        </div>
    );

    /* Not signed in */
    if (!session) return (
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "52px", height: "52px", borderRadius: "16px", background: "rgba(79,70,229,.14)", border: "1px solid rgba(79,70,229,.28)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5b4fc" }}>
                <ImageIcon size={22} />
            </div>
            <div>
                <p style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "0.95rem", color: "#eeeeff", marginBottom: "6px" }}>
                    Connect Google Photos
                </p>
                <p style={{ fontSize: "0.8rem", color: "rgba(152,152,184,.75)", lineHeight: 1.65 }}>
                    Sign in to upload & organise photos in albums.
                </p>
            </div>
            <button onClick={() => signIn("google")} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 20px", borderRadius: "999px",
                background: "#fff", color: "#111", border: "none",
                fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
                boxShadow: "0 4px 18px rgba(0,0,0,.35)",
                fontFamily: "Inter, sans-serif", transition: "background .2s",
            }}
                onMouseOver={e => e.currentTarget.style.background = "#f0f0f0"}
                onMouseOut={e => e.currentTarget.style.background = "#fff"}
            >
                <svg width="16" height="16" viewBox="0 0 24 24">
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
            {/* Connected user row */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "11px 14px", borderRadius: "14px",
                background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {session.user?.image
                        ? <img src={session.user.image} alt="avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid rgba(255,255,255,.14)" }} />
                        : <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(79,70,229,.25)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Space Grotesk", fontWeight: 700, color: "#a5b4fc" }}>
                            {session.user?.name?.[0] || "U"}
                        </div>
                    }
                    <div>
                        <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "#eeeeff", lineHeight: 1.2, fontFamily: "Space Grotesk" }}>
                            Google Photos Connected
                        </p>
                        <p style={{ fontSize: "0.7rem", color: "rgba(152,152,184,.7)" }}>{session.user?.email}</p>
                    </div>
                </div>
                <button onClick={() => signOut()} title="Disconnect" style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "rgba(152,152,184,.55)", padding: "5px", borderRadius: "8px", display: "flex",
                    transition: "all .2s",
                }}
                    onMouseOver={e => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(225,29,72,.1)"; }}
                    onMouseOut={e => { e.currentTarget.style.color = "rgba(152,152,184,.55)"; e.currentTarget.style.background = "transparent"; }}
                >
                    <LogOut size={15} />
                </button>
            </div>

            {/* Album selector */}
            <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "rgba(152,152,184,.8)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "7px", fontFamily: "Space Grotesk" }}>
                    Upload to Album
                </label>

                {/* Dropdown trigger */}
                <div style={{ position: "relative" }}>
                    <button
                        type="button"
                        onClick={() => setShowAlbumDrop(v => !v)}
                        style={{
                            width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "10px 14px", borderRadius: "12px", cursor: "pointer",
                            background: "rgba(10,10,22,.7)", border: "1px solid rgba(255,255,255,.09)",
                            color: "#eeeeff", fontSize: "0.85rem", fontFamily: "Space Grotesk",
                            transition: "border-color .18s",
                        }}
                    >
                        <span>{selectedLabel}</span>
                        <ChevronDown size={14} style={{ opacity: .6, transform: showAlbumDrop ? "rotate(180deg)" : "", transition: "transform .2s" }} />
                    </button>

                    {showAlbumDrop && (
                        <div style={{
                            position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
                            background: "rgba(12,12,28,.97)", border: "1px solid rgba(255,255,255,.1)",
                            borderRadius: "14px", overflow: "hidden", boxShadow: "0 16px 48px rgba(0,0,0,.7)",
                            maxHeight: "200px", overflowY: "auto",
                        }}>
                            {/* Create new album option */}
                            <button type="button" onClick={() => { setSelectedAlbum("new"); setShowAlbumDrop(false); }} style={{
                                width: "100%", padding: "10px 14px", textAlign: "left",
                                background: selectedAlbum === "new" ? "rgba(79,70,229,.2)" : "transparent",
                                border: "none", borderBottom: "1px solid rgba(255,255,255,.06)",
                                color: "#c4b5fd", fontSize: "0.84rem", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "8px", fontFamily: "Space Grotesk", fontWeight: 600,
                            }}>
                                <Plus size={13} /> Create New Album
                            </button>
                            {/* No album option */}
                            <button type="button" onClick={() => { setSelectedAlbum("none"); setShowAlbumDrop(false); }} style={{
                                width: "100%", padding: "10px 14px", textAlign: "left",
                                background: selectedAlbum === "none" ? "rgba(79,70,229,.13)" : "transparent",
                                border: "none", borderBottom: "1px solid rgba(255,255,255,.06)",
                                color: "var(--text-2)", fontSize: "0.84rem", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "8px", fontFamily: "Inter",
                            }}>
                                No album (Camera Roll)
                            </button>
                            {/* Existing albums */}
                            {albumsLoading && <div style={{ padding: "12px 14px", fontSize: "0.8rem", color: "rgba(152,152,184,.5)" }}>Loading albums...</div>}
                            {albums.map(a => (
                                <button key={a.id} type="button" onClick={() => { setSelectedAlbum(a.id); setShowAlbumDrop(false); }} style={{
                                    width: "100%", padding: "10px 14px", textAlign: "left",
                                    background: selectedAlbum === a.id ? "rgba(79,70,229,.15)" : "transparent",
                                    border: "none", borderBottom: "1px solid rgba(255,255,255,.04)",
                                    color: "#eeeeff", fontSize: "0.83rem", cursor: "pointer",
                                    display: "flex", alignItems: "center", gap: "8px", fontFamily: "Inter",
                                }}>
                                    <FolderOpen size={13} style={{ opacity: .6 }} /> {a.title}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* New album name input */}
                {selectedAlbum === "new" && (
                    <input
                        value={newAlbumTitle}
                        onChange={e => setNewAlbumTitle(e.target.value)}
                        placeholder="Album name, e.g. Japan 2026"
                        style={{
                            marginTop: "8px", background: "rgba(10,10,22,.7)",
                            border: "1px solid rgba(79,70,229,.35)", borderRadius: "12px",
                            color: "#eeeeff", fontSize: "0.84rem", padding: "9px 13px",
                            width: "100%", fontFamily: "Inter",
                        }}
                    />
                )}
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("gp-upload").click()}
                style={{
                    border: `2px dashed ${dragOver ? "rgba(79,70,229,.7)" : file ? "rgba(13,148,136,.5)" : "rgba(255,255,255,.1)"}`,
                    borderRadius: "16px", padding: "20px 14px", textAlign: "center",
                    background: dragOver ? "rgba(79,70,229,.06)" : file ? "rgba(13,148,136,.04)" : "rgba(255,255,255,.02)",
                    cursor: "pointer", transition: "all .2s",
                }}
            >
                <input type="file" id="gp-upload" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
                <UploadCloud size={22} color={file ? "#6ee7b7" : "rgba(152,152,184,.45)"} style={{ margin: "0 auto 7px" }} />
                <p style={{ fontSize: "0.8rem", fontWeight: 600, color: file ? "#6ee7b7" : "rgba(152,152,184,.65)", marginBottom: "3px" }}>
                    {file ? file.name : "Drop an image here"}
                </p>
                <p style={{ fontSize: "0.7rem", color: "rgba(152,152,184,.4)" }}>
                    {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "or click to browse"}
                </p>
            </div>

            {/* Upload button */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    padding: "11px", borderRadius: "14px", border: "none",
                    cursor: file && !uploading ? "pointer" : "not-allowed",
                    fontFamily: "Space Grotesk", fontWeight: 700, fontSize: "0.85rem",
                    background: !file || uploading ? "rgba(255,255,255,.05)" : "linear-gradient(135deg,#7c3aed,#4f46e5,#2563eb)",
                    color: !file || uploading ? "rgba(152,152,184,.45)" : "white",
                    boxShadow: file && !uploading ? "0 4px 20px rgba(79,70,229,.4)" : "none",
                    transition: "all .25s",
                }}
            >
                {uploading
                    ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Uploading...</>
                    : <><UploadCloud size={15} /> Upload to Google Photos</>
                }
            </button>

            {/* Message */}
            {message && (
                <div style={{
                    display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px",
                    borderRadius: "12px",
                    background: message.type === "success" ? "rgba(13,148,136,.09)" : "rgba(225,29,72,.09)",
                    border: `1px solid ${message.type === "success" ? "rgba(13,148,136,.3)" : "rgba(225,29,72,.3)"}`,
                    color: message.type === "success" ? "#6ee7b7" : "#fda4af",
                    fontSize: "0.8rem", fontWeight: 600,
                }}>
                    {message.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    {message.text}
                </div>
            )}

            <style>{`@keyframes spin { to{transform:rotate(360deg);} } @keyframes shimmer { 0%{background-position:-200% 0}100%{background-position:200% 0} }`}</style>
        </div>
    );
}
