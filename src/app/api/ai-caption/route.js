import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai-caption
// Body: { imageBase64: string, mimeType: string }
// Returns: { caption: string }
export async function POST(req) {
    try {
        const { imageBase64, mimeType } = await req.json();
        if (!imageBase64) {
            return Response.json({ error: "No image provided" }, { status: 400 });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                                detail: "low",  // faster & cheaper
                            },
                        },
                        {
                            type: "text",
                            text: `You are a travel journal AI. Look at this travel photo and write one vivid, poetic sentence that captures the mood, location, and feeling of the moment — like a caption in a beautiful travel diary. Keep it under 20 words. Be creative, warm, and evocative. No hashtags, no generic descriptions.`,
                        },
                    ],
                },
            ],
            max_tokens: 80,
            temperature: 0.9,
        });

        const caption = completion.choices[0]?.message?.content?.trim() || "A beautiful moment captured in time. ✨";
        return Response.json({ success: true, caption });

    } catch (error) {
        console.error("AI caption error:", error);
        return Response.json({ error: error.message || "Caption failed" }, { status: 500 });
    }
}
