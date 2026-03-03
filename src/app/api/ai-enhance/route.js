import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
    try {
        const body = await req.json();
        const { title, location, country, category, mood, description, companions, highlights } = body;

        const prompt = `You are a creative and fun travel companion AI. A traveler is logging a memory about their trip. Based on the details below, generate an enriched, entertaining, and informative response.

TRIP DETAILS:
- Title: ${title || "A travel memory"}
- Location: ${location || "Unknown"}
- Country: ${country || "Unknown"}
- Category: ${category || "General"}
- Mood: ${mood || "Happy"}
- Their Description: ${description || "No description yet"}
- Companions: ${companions || "Solo"}
- Highlights: ${highlights || "None mentioned"}

Please respond with a JSON object containing these fields:
{
  "enhancedDescription": "A vivid, poetic 2-3 sentence version of their memory that captures the magic of the moment. Make it personal and emotional.",
  "funFacts": ["3 fascinating and lesser-known fun facts about this location or country"],
  "travelTips": ["3 practical insider tips for anyone visiting this place"],
  "localCuisine": ["3 must-try local dishes or drinks at this destination with brief descriptions"],
  "bestTimeToVisit": "One sentence about the ideal time to visit this place and why",
  "packingTip": "One fun and specific packing suggestion for this destination",
  "localPhrase": "A useful local phrase in the native language with translation and pronunciation",
  "hiddenGem": "One hidden gem or secret spot near this location that most tourists miss",
  "soundtrack": "A song that perfectly captures the vibe of this destination with artist name",
  "memoryPrompt": "A creative question or prompt to help them remember more details about this trip"
}

IMPORTANT: Return ONLY valid JSON, no markdown or extra text.`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a creative travel AI that returns only valid JSON. Always respond with rich, entertaining, and accurate travel information." },
                { role: "user", content: prompt },
            ],
            temperature: 0.85,
            max_tokens: 1200,
        });

        const text = completion.choices[0]?.message?.content || "{}";

        // Try to parse the JSON response
        let parsed;
        try {
            // Remove potential markdown code block wrapping
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = { enhancedDescription: text, funFacts: [], travelTips: [], localCuisine: [] };
        }

        return Response.json({ success: true, data: parsed });
    } catch (error) {
        console.error("AI enhance error:", error);
        return Response.json(
            { error: error.message || "AI enhancement failed" },
            { status: 500 }
        );
    }
}
