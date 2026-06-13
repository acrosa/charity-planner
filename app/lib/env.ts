// Centralized env access. Required vars throw if missing (fail fast at the
// boundary); optional vars return undefined so features degrade gracefully.

export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const hasElevenLabs = () => !!process.env.ELEVENLABS_API_KEY;
export const hasMotionPlus = () => !!process.env.MOTION_TOKEN;
