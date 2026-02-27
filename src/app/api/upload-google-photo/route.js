import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const albumMode = formData.get("albumMode") || "none";  // "new" | "none" | <albumId>
        const albumTitle = formData.get("albumTitle") || "My Trip";
        const albumId = formData.get("albumId") || null;

        if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        /* ── 1. Upload raw bytes ─────────────────────── */
        const uploadRes = await fetch("https://photoslibrary.googleapis.com/v1/uploads", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/octet-stream",
                "X-Goog-Upload-Content-Type": file.type,
                "X-Goog-Upload-Protocol": "raw",
            },
            body: buffer,
        });

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error("Failed to upload bytes:", errText);
            return Response.json({ error: "Failed to upload bytes to Google Photos" }, { status: uploadRes.status });
        }

        const uploadToken = await uploadRes.text();

        /* ── 2. Resolve album ID ─────────────────────── */
        let resolvedAlbumId = null;

        if (albumMode === "new") {
            // Create a new album
            const createAlbumRes = await fetch("https://photoslibrary.googleapis.com/v1/albums", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ album: { title: albumTitle } }),
            });
            if (createAlbumRes.ok) {
                const albumData = await createAlbumRes.json();
                resolvedAlbumId = albumData.id;
            } else {
                // Don't fail — just upload without album
                console.warn("Could not create album, uploading without.");
            }
        } else if (albumMode !== "none" && albumId) {
            resolvedAlbumId = albumId;
        }

        /* ── 3. Create media item (optionally in album) ─ */
        const body = {
            newMediaItems: [{
                description: "Uploaded from Travel Memories",
                simpleMediaItem: { uploadToken },
            }],
        };
        if (resolvedAlbumId) {
            body.albumId = resolvedAlbumId;
        }

        const createRes = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const result = await createRes.json();
        if (!createRes.ok) {
            console.error("Failed to create media item:", result);
            return Response.json({ error: "Failed to create media item" }, { status: createRes.status });
        }

        return Response.json({
            success: true,
            result,
            albumId: resolvedAlbumId,
        });

    } catch (error) {
        console.error("Upload error:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
