import { getOpenAIClient } from '../../lib/openai.js';

export interface CrossEncoder {
  rerank(query: string, passages: string[]): Promise<{ index: number; score: number }[]>;
}

export class APICrossEncoder implements CrossEncoder {
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
    this.model = process.env.CROSS_ENCODER_MODEL ?? 'rerank-english-v3.0';
  }

  async rerank(query: string, passages: string[]): Promise<{ index: number; score: number }[]> {
    const response = await fetch('https://api.cohere.com/v1/rerank', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        query,
        documents: passages,
        return_documents: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cohere rerank failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      results: { index: number; relevance_score: number }[];
    };

    return data.results.map((r) => ({
      index: r.index,
      score: r.relevance_score,
    }));
  }
}

export class LLMCrossEncoder implements CrossEncoder {
  async rerank(query: string, passages: string[]): Promise<{ index: number; score: number }[]> {
    const client = getOpenAIClient();

    const scores = await Promise.all(
      passages.map(async (passage, index) => {
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a relevance scorer. Given a query and a passage, score how relevant the passage is to the query on a scale from 0 to 1. Respond with only a number between 0 and 1, nothing else.',
            },
            {
              role: 'user',
              content: `Query: ${query}\n\nPassage: ${passage}`,
            },
          ],
          max_tokens: 10,
          temperature: 0,
        });

        const raw = response.choices[0]?.message?.content?.trim() ?? '0';
        const score = parseFloat(raw);
        return { index, score: isNaN(score) ? 0 : Math.min(1, Math.max(0, score)) };
      }),
    );

    return scores;
  }
}

export function createCrossEncoder(): CrossEncoder {
  const provider = process.env.CROSS_ENCODER_PROVIDER ?? 'llm';

  if (provider === 'cohere') {
    return new APICrossEncoder();
  }

  return new LLMCrossEncoder();
}
