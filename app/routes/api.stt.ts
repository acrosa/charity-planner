import type { Route } from "./+types/api.stt";

// Speech-to-text proxy (ElevenLabs Scribe). Receives the recorded audio blob and
// returns the transcript. Hands-free interview: the client records, silence-VAD
// ends the turn, this transcribes, and the text is submitted as the answer.
export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return Response.json({ error: "voice not configured" }, { status: 503 });

  try {
    const audio = await request.arrayBuffer();
    if (audio.byteLength < 1200) {
      // Too short to contain speech — return empty so the client re-listens.
      return Response.json({ text: "" });
    }
    const contentType = request.headers.get("content-type") || "audio/webm";
    const form = new FormData();
    form.append("model_id", "scribe_v1");
    form.append("file", new Blob([audio], { type: contentType }), "answer.webm");

    const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) {
      console.error("[api.stt] elevenlabs", res.status, (await res.text()).slice(0, 120));
      return Response.json({ error: "stt failed" }, { status: 502 });
    }
    const data = (await res.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim() });
  } catch (err) {
    console.error("[api.stt] error:", String(err).slice(0, 120));
    return Response.json({ error: "stt failed" }, { status: 502 });
  }
}
