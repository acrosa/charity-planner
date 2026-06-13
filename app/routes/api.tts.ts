import { z } from "zod";
import type { Route } from "./+types/api.tts";

// Text-to-speech proxy (ElevenLabs). Speaks the agent's interview questions when
// voice mode is on. Returns audio/mpeg bytes; 503 if voice isn't configured so
// the client falls back to typed/silent mode gracefully.
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel — warm, clear
const MODEL = "eleven_turbo_v2_5"; // low latency

const RequestSchema = z.object({ text: z.string().min(1).max(1200) });

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "voice not configured" }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid request" }, { status: 400 });

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: parsed.data.text,
          model_id: MODEL,
          voice_settings: { stability: 0.4, similarity_boost: 0.75 },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok || !res.body) {
      return Response.json({ error: "tts failed" }, { status: 502 });
    }
    return new Response(res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[api.tts] error:", String(err).slice(0, 120));
    return Response.json({ error: "tts failed" }, { status: 502 });
  }
}
