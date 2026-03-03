import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// GET /api/google-photos?albumId=xxx  — fetches media items from a specific album (WORKS)
// GET /api/google-photos               — returns empty (Google restricts full library for unverified apps)
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const albumId = searchParams.get("albumId");

        // Without albumId, Google rejects mediaItems:search for unverified apps.
        // Return empty so the UI shows "select an album" message.
        if (!albumId) {
            return Response.json({ photos: [], requiresAlbum: true });
        }

        // With albumId, fetch photos from that specific album — this works with appendonly + readonly scopes
        const res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${session.accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ albumId, pageSize: 100 }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Photos API error:", err);
            return Response.json({ photos: [], error: "Failed to fetch album photos" });
        }

        const data = await res.json();
        const photos = (data.mediaItems || []).map((item) => ({
            id: item.id,
            baseUrl: item.baseUrl,
            filename: item.filename,
            mimeType: item.mimeType,
            creationTime: item.mediaMetadata?.creationTime,
            width: item.mediaMetadata?.width,
            height: item.mediaMetadata?.height,
            description: item.description || null,
        }));

        return Response.json({ photos });
    } catch (err) {
        console.error("Error fetching photos:", err);
        return Response.json({ photos: [] });
    }
}
