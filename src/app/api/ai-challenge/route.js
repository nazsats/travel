import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai-challenge
// Body: { memories: [...], userCountry?: string }
// Returns 5 personalised travel challenges
export async function POST(req) {
    try {
        const { memories = [], userCountry = "Unknown" } = await req.json();

        // Summarise memory history for the prompt
        const visitedCountries = [...new Set(memories.map(m => m.country).filter(Boolean))];
        const visitedCategories = [...new Set(memories.map(m => m.category).filter(Boolean))];
        const visitedMoods = [...new Set(memories.map(m => m.mood).filter(Boolean))];
        const visitedLocations = memories.slice(-5).map(m => `${m.location}, ${m.country}`).join(" | ");

        const prompt = `You are a bold travel challenge creator. A travel enthusiast is currently in ${userCountry}.

THEIR TRAVEL HISTORY:
- Countries visited: ${visitedCountries.join(", ") || "Just starting out"}
- Favourite categories: ${visitedCategories.join(", ") || "Everything"}
- Moods experienced: ${visitedMoods.join(", ") || "Various"}
- Recent trips: ${visitedLocations || "None yet"}

Generate 5 exciting, personalised travel challenges that will push their boundaries. Mix Easy 🌱 and Hard 🔥 difficulties. Make them specific, achievable, and inspiring.

Return ONLY valid JSON:
{
  "challenges": [
    {
      "title": "Challenge title (max 8 words)",
      "description": "2-sentence description of what to do and why it matters",
      "difficulty": "Easy",
      "xp": 100,
      "badge": "badge emoji + 2-word badge name (e.g. 🌏 Asia Explorer)",
      "hint": "One specific pro tip to help them start this challenge"
    },
    {
      "title": "...",
      "description": "...",
      "difficulty": "Hard",
      "xp": 300,
      "badge": "...",
      "hint": "..."
    }
  ]
}

Rules:
- Easy challenges: 30-day window, approachable for anyone
- Hard challenges: 7-day window, intense, culture-shock worthy
- Personalise to their current location (${userCountry}) and history
- Make them culturally rich and travel-specific, not generic
- Mix categories: food, adventure, culture, nature, social`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an expert travel challenge designer. Return only valid JSON." },
                { role: "user", content: prompt },
            ],
            temperature: 0.92,
            max_tokens: 1200,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"challenges":[]}');
        return Response.json({ success: true, challenges: parsed.challenges || [] });

    } catch (error) {
        console.error("AI challenge error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
