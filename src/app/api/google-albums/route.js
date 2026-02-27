import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const res = await fetch("https://photoslibrary.googleapis.com/v1/albums?pageSize=50", {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        });

        if (!res.ok) {
            return Response.json({ albums: [] });
        }

        const data = await res.json();
        const albums = (data.albums || []).map(a => ({
            id: a.id,
            title: a.title,
            itemCount: a.mediaItemsCount,
            coverUrl: a.coverPhotoBaseUrl,
        }));

        return Response.json({ albums });
    } catch (err) {
        console.error("Error fetching albums:", err);
        return Response.json({ albums: [] });
    }
}
