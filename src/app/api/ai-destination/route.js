import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
    try {
        const { memories, userCountry } = await req.json();

        const visited = memories.map(m => `${m.location}${m.country ? ', ' + m.country : ''} (${m.category || 'General'}, rated ${m.rating || '?'}/5)`).join('\n');
        const categories = [...new Set(memories.map(m => m.category).filter(Boolean))];
        const countries = [...new Set(memories.map(m => m.country).filter(Boolean))];
        const moods = [...new Set(memories.map(m => m.mood).filter(Boolean))];

        const prompt = `You are an elite AI travel advisor with deep knowledge of world geography and cultures. Analyse this traveler's journey history and recommend their PERFECT next destination.

TRAVELER PROFILE:
- Based in: ${userCountry || 'Unknown'}
- Countries visited: ${countries.join(', ') || 'None yet'}
- Favourite categories: ${categories.join(', ') || 'General'}
- Travel moods: ${moods.join(', ') || 'Various'}
- Memories logged:
${visited || 'No memories yet — recommend a starter destination!'}

TASK: Pick ONE perfect next destination that:
1. Complements their travel style and unlocks a new region they haven't explored
2. Matches the patterns you see in their travel moods and categories
3. Is specific (a city/place, not just a country)

Return ONLY valid JSON (no markdown):
{
  "destination": "Specific city or place name",
  "country": "Country name",
  "latitude": 0.0,
  "longitude": 0.0,
  "tagline": "A single evocative sentence about why this place is calling them",
  "reasoning": "2-3 sentences explaining exactly why this matches their travel DNA based on their history",
  "category": "Which of their favourite categories this excels at",
  "bestFor": ["3 specific things this destination is perfect for, matching their style"],
  "insiderTip": "One ultra-specific insider secret only a true traveler would know",
  "dreamScore": 95
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are an elite AI travel advisor. Return only valid JSON with accurate latitude/longitude coordinates." },
                { role: "user", content: prompt },
            ],
            temperature: 0.85,
            max_tokens: 800,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        return Response.json({ success: true, data: parsed });

    } catch (error) {
        console.error("AI destination error:", error);
        return Response.json({ error: error.message || "Failed" }, { status: 500 });
    }
}
