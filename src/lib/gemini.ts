// Thin wrapper around the Gemini Generative Language API.
// Server-only. Reads GEMINI_API_KEY from env; never exposes it to the client.
//
// Model can be overridden via GEMINI_MODEL env. Default is gemini-2.0-flash —
// it's broadly available and fast. Use gemini-2.5-flash for stronger answers
// if your key supports it.

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

export function geminiEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

type GeminiOpts = {
  system?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseJson?: boolean;
  model?: string;
};

export async function geminiText(prompt: string, opts: GeminiOpts = {}): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = opts.model ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      maxOutputTokens: opts.maxOutputTokens ?? 800,
    },
  };
  if (opts.system) {
    body.systemInstruction = { parts: [{ text: opts.system }] };
  }
  if (opts.responseJson) {
    body.generationConfig.responseMimeType = "application/json";
  }

  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn("[gemini] http", res.status, await res.text().catch(() => ""));
      return null;
    }
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("\n");
    return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
  } catch (err) {
    console.warn("[gemini] fetch error", (err as Error).message);
    return null;
  }
}

export async function geminiJson<T>(prompt: string, opts: Omit<GeminiOpts, "responseJson"> = {}): Promise<T | null> {
  const text = await geminiText(prompt, { ...opts, responseJson: true });
  if (!text) return null;
  try {
    // Models sometimes wrap JSON in ```json ... ``` despite the mime type.
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn("[gemini] JSON parse failed:", (err as Error).message, text.slice(0, 200));
    return null;
  }
}
