// Server-only helper for an OpenAI-compatible chat-completions API.
// Works with OpenAI, OpenRouter, or another compatible provider.

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function chatJSON<T = unknown>(
  model: string,
  messages: ChatMessage[],
): Promise<T> {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  if (!apiKey) {
    throw new Error("AI_API_KEY is not configured. Add it to your .env file.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.AI_SITE_URL ? { "HTTP-Referer": process.env.AI_SITE_URL } : {}),
      ...(process.env.AI_APP_NAME ? { "X-Title": process.env.AI_APP_NAME } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    if (response.status === 429) {
      throw new Error("The AI service is busy or rate-limited. Please try again shortly.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("The AI API key is invalid or does not have access to this model.");
    }
    throw new Error(`AI request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content ?? "{}";

  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonBlock = content.match(/\{[\s\S]*\}/);
    if (jsonBlock) return JSON.parse(jsonBlock[0]) as T;
    throw new Error("The AI service returned invalid JSON.");
  }
}
