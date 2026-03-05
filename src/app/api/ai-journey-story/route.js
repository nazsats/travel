import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
    try {
        const { memories } = await req.json();

        if (!memories?.length) {
            return Response.json({ error: "No memories to narrate" }, { status: 400 });
        }

        // Sort chronologically
        const sorted = [...memories].sort((a, b) => new Date(a.date) - new Date(b.date));

        const memorySummaries = sorted.map((m, i) =>
            `Chapter ${i + 1}: ${m.title} — ${m.location}${m.country ? ', ' + m.country : ''} on ${m.date ? new Date(m.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'unknown date'}. Category: ${m.category || 'General'}. Mood: ${m.mood || 'Happy'}. Rating: ${m.rating || 5}/5. Highlights: ${m.highlights || 'A wonderful experience.'}`
        ).join('\n\n');

        const prompt = `You are a celebrated travel memoirist in the style of Paul Theroux and Pico Iyer. Craft a beautifully written, emotionally resonant first-person travel narrative from this traveler's journey.

JOURNEY MEMORIES (chronological):
${memorySummaries}

Write a flowing, literary travel narrative (3-5 paragraphs) that:
1. Opens with a cinematic hook from their earliest memory
2. Weaves all locations into a cohesive life journey (not just a list)
3. Captures the emotional arc — how each place changed them
4. Uses vivid sensory language: sights, sounds, smells, tastes
5. Closes with a poetic reflection on what their travels reveal about who they are

Return ONLY valid JSON:
{
  "title": "A beautiful, poetic title for their travel story (e.g. 'Of Roads Taken and Stars Followed')",
  "subtitle": "A short evocative subtitle",
  "story": "The full narrative text (use \\n\\n for paragraph breaks)",
  "openingLine": "The single most powerful sentence from the story to use as a pull-quote",
  "travelPersona": "A 2-3 word poetic description of this traveler's soul (e.g. 'Curious Wanderer', 'Cultural Pilgrim')",
  "totalChapters": ${sorted.length}
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a celebrated travel memoirist. Write beautiful, literary, emotionally resonant travel narratives. Return only valid JSON." },
                { role: "user", content: prompt },
            ],
            temperature: 0.92,
            max_tokens: 1800,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
        return Response.json({ success: true, data: parsed });

    } catch (error) {
        console.error("AI journey story error:", error);
        return Response.json({ error: error.message || "Failed" }, { status: 500 });
    }
}
