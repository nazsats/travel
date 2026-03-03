import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// GET /api/google-photos?albumId=xxx  — fetches media items from an album
// GET /api/google-photos               — fetches recent photos (no album filter)
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const albumId = searchParams.get("albumId");

        let res;
        if (albumId) {
            // Search within a specific album
            res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems:search", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ albumId, pageSize: 50 }),
            });
        } else {
            // Fetch recent media items
            res = await fetch("https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=50", {
                headers: { Authorization: `Bearer ${session.accessToken}` },
            });
        }

        if (!res.ok) {
            const err = await res.text();
            console.error("Photos API error:", err);
            return Response.json({ photos: [] });
        }

        const data = await res.json();
        const photos = (data.mediaItems || []).map((item) => ({
            id: item.id,
            baseUrl: item.baseUrl,        // append =w800 for full quality
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
