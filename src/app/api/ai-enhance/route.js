import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
    try {
        const body = await req.json();
        const { title, location, country, category, mood, description, companions, highlights, foodTried, localTips, rating } = body;

        const prompt = `You are a world-class travel storyteller and cultural expert AI. A traveler is logging a memory. Make it magical.

MEMORY DETAILS:
- Title: ${title || "A travel memory"}
- Location: ${location || "Unknown"}, ${country || "Unknown"}
- Category: ${category || "General"}
- Mood: ${mood || "Happy"} | Rating: ${rating || "5"}/5
- Description: ${description || "No description yet"}
- Companions: ${companions || "Solo"}
- Highlights: ${highlights || "None"}
- Food tried: ${foodTried || "None mentioned"}
- Local tips noted: ${localTips || "None"}

Return ONLY a valid JSON object (no markdown, no text outside JSON):
{
  "enhancedDescription": "A vivid, emotional 3-sentence travel diary entry written in first person. Capture sensory details: sights, sounds, smells, feelings. Make it feel like a bestselling travel memoir.",
  "funFacts": ["3 surprising, specific facts about this exact location or country that most people don't know"],
  "travelTips": ["3 hyper-practical, insider tips specific to this destination — things only locals know"],
  "localCuisine": ["3 must-try dishes/drinks at this destination with a rich description of each — textures, flavors, where to find them"],
  "bestTimeToVisit": "One sentence about the perfect season to visit and exactly why",
  "packingTip": "One specific, clever packing suggestion uniquely relevant to this destination",
  "localPhrase": "One essential local phrase — include the phrase, language, romanized pronunciation, and English meaning",
  "hiddenGem": "One ultra-specific hidden gem or secret experience nearby that 99% of tourists miss",
  "soundtrack": "One perfect song that captures this destination's spirit — include artist, song title, and why it fits",
  "memoryPrompt": "One creative, introspective question to help them unlock deeper memories of this trip",
  "moodColor": "A single hex color that represents the mood of this memory (e.g. #FFB347 for a warm sunset)",
  "travelQuote": "A famous or poetic quote about travel that perfectly fits this destination or experience"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are a world-class travel writer and cultural expert. You create rich, accurate, poetic travel content. Always return only valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.88,
            max_tokens: 1600,
            response_format: { type: "json_object" },
        });

        const text = completion.choices[0]?.message?.content || "{}";
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch {
            const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            parsed = JSON.parse(cleaned);
        }

        return Response.json({ success: true, data: parsed });

    } catch (error) {
        console.error("AI enhance error:", error);
        return Response.json({ error: error.message || "AI enhancement failed" }, { status: 500 });
    }
}
