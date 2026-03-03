import OpenAI from "openai";
import { db } from "@/lib/firebase-admin";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/ai-reflect
// Body: memory object from Firestore
// Saves result back to Firestore and returns it
export async function POST(req) {
    try {
        const memory = await req.json();

        const prompt = `You are a poetic travel journal AI. A traveler logged this memory:

TITLE: ${memory.title || "—"}
LOCATION: ${memory.location || "—"}, ${memory.country || "—"}
DATE: ${memory.date || "—"}
MOOD: ${memory.mood || "—"} | RATING: ${memory.rating || "—"}/5
COMPANIONS: ${memory.companions || "Solo"}
TRANSPORT: ${memory.transport || "—"}
WEATHER: ${memory.weather || "—"}
HIGHLIGHTS: ${memory.highlights || "—"}

Return ONLY a valid JSON object:
{
  "reflection": "A deeply personal, poetic 3-sentence diary entry written in first person as if the traveler is writing it years later. Use sensory details: smells, sounds, light. Make it emotional and nostalgic.",
  "question1": "A thoughtful introspective question that helps them recall a forgotten detail of this trip",
  "question2": "A question that connects this trip to something bigger in their life or personal growth"
}`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a poetic travel memoir writer. Return only valid JSON." },
                { role: "user", content: prompt },
            ],
            temperature: 0.9,
            max_tokens: 500,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");

        // Save to Firestore
        if (memory.id) {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db: clientDb } = await import("@/lib/firebase");
            await updateDoc(doc(clientDb, "memories", memory.id), {
                aiReflection: parsed.reflection || "",
                aiQuestion1: parsed.question1 || "",
                aiQuestion2: parsed.question2 || "",
            });
        }

        return Response.json({ success: true, data: parsed });
    } catch (error) {
        console.error("AI reflect error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
