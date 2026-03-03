import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

// Upload a buffer to Firebase Storage via REST and return the public download URL
async function uploadToFirebaseStorage(buffer, filename, mimeType) {
    const encodedName = encodeURIComponent(`travel-photos/${Date.now()}_${filename}`);
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedName}&uploadType=media&key=${FIREBASE_API_KEY}`;

    const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": mimeType },
        body: buffer,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Firebase Storage upload failed: ${err}`);
    }

    const data = await res.json();
    // Build the permanent public download URL
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(data.name)}?alt=media&token=${data.downloadTokens}`;
    return downloadUrl;
}

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");
        const albumMode = formData.get("albumMode") || "none";
        const albumTitle = formData.get("albumTitle") || "My Trip";
        const albumId = formData.get("albumId") || null;

        if (!file) {
            return Response.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        /* ── 1. Upload to Firebase Storage (permanent URL) ── */
        let firebaseUrl = null;
        try {
            firebaseUrl = await uploadToFirebaseStorage(buffer, file.name, file.type);
            console.log("✅ Saved to Firebase Storage:", firebaseUrl.substring(0, 80) + "...");
        } catch (storageErr) {
            console.error("Firebase Storage error:", storageErr.message);
            // Continue — still try to upload to Google Photos
        }

        /* ── 2. Upload raw bytes to Google Photos ──────────── */
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
            // If we have a Firebase URL, still save to Firestore and return success
            if (firebaseUrl) {
                await saveToFirestore({ firebaseUrl, filename: file.name, mimeType: file.type, albumId: null, albumTitle: null, session });
                return Response.json({ success: true, firebaseOnly: true });
            }
            return Response.json({ error: "Failed to upload bytes to Google Photos" }, { status: uploadRes.status });
        }

        const uploadToken = await uploadRes.text();

        /* ── 3. Resolve album ──────────────────────────────── */
        let resolvedAlbumId = null;
        let resolvedAlbumTitle = null;

        if (albumMode === "new") {
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
                resolvedAlbumTitle = albumTitle;
            }
        } else if (albumMode !== "none" && albumId) {
            resolvedAlbumId = albumId;
            resolvedAlbumTitle = albumTitle;
        }

        /* ── 4. Create media item in Google Photos ─────────── */
        const body = {
            newMediaItems: [{
                description: "Uploaded from Travel Memories",
                simpleMediaItem: { uploadToken, fileName: file.name },
            }],
        };
        if (resolvedAlbumId) body.albumId = resolvedAlbumId;

        const createRes = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        const result = await createRes.json();
        const mediaItem = result.newMediaItemResults?.[0]?.mediaItem;

        /* ── 5. Save to Firestore ──────────────────────────── */
        await saveToFirestore({
            firebaseUrl,
            filename: file.name,
            mimeType: file.type,
            albumId: resolvedAlbumId,
            albumTitle: resolvedAlbumTitle,
            googlePhotosId: mediaItem?.id || null,
            googleProductUrl: mediaItem?.productUrl || null,
            session,
        });

        return Response.json({
            success: true,
            albumId: resolvedAlbumId,
            firebaseUrl,
        });

    } catch (error) {
        console.error("Upload error:", error);
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function saveToFirestore({ firebaseUrl, filename, mimeType, albumId, albumTitle, googlePhotosId, googleProductUrl, session }) {
    try {
        const doc = {
            filename: filename || null,
            mimeType: mimeType || null,
            albumId: albumId || null,
            albumTitle: albumTitle || null,
            uploadedBy: session.user?.email || null,
            createdAt: serverTimestamp(),
        };
        // Only add fields that are defined
        if (firebaseUrl) doc.firebaseUrl = firebaseUrl;
        if (googlePhotosId) doc.googlePhotosId = googlePhotosId;
        if (googleProductUrl) doc.googleProductUrl = googleProductUrl;

        await addDoc(collection(db, "google_photos"), doc);
        console.log("✅ Saved to Firestore");
    } catch (err) {
        console.error("Could not save to Firestore:", err.message);
    }
}
