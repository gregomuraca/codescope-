import { assertRemoteEndpointAllowed } from "../security.js";

export interface EmbeddingsProvider {
  readonly name: string;
  embed(inputs: string[]): Promise<number[][]>;
}

interface CompatibleResponse {
  data?: Array<{ index?: number; embedding?: number[] }>;
}

export class CompatibleEmbeddingsProvider implements EmbeddingsProvider {
  readonly name = "compatible-embeddings";

  constructor(
    private readonly endpoint: string,
    private readonly model: string,
    private readonly apiKey?: string
  ) {
    assertRemoteEndpointAllowed(endpoint);
  }

  async embed(inputs: string[]): Promise<number[][]> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: this.model, input: inputs })
    });

    if (!response.ok) {
      throw new Error(`Embedding endpoint failed with HTTP ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as CompatibleResponse;
    const rows = [...(payload.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    if (rows.length !== inputs.length || rows.some((row) => !Array.isArray(row.embedding))) {
      throw new Error("Embedding endpoint returned an unexpected response shape.");
    }
    return rows.map((row) => row.embedding as number[]);
  }
}

export function providerFromEnvironment(): EmbeddingsProvider | null {
  const endpoint = process.env.CODESCOPE_EMBEDDINGS_URL?.trim();
  if (!endpoint) return null;
  const model = process.env.CODESCOPE_EMBEDDINGS_MODEL?.trim() || "default";
  const apiKey = process.env.CODESCOPE_EMBEDDINGS_API_KEY?.trim();
  return new CompatibleEmbeddingsProvider(endpoint, model, apiKey || undefined);
}
