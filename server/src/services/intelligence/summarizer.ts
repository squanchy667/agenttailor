import { getOpenAIClient } from '../../lib/openai.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'our', 'their', 'not', 'no', 'so', 'if', 'as', 'can', 'also', 'then',
  'than', 'when', 'where', 'which', 'who', 'what', 'how', 'all', 'each',
  'more', 'other', 'some', 'such', 'only', 'same', 'any', 'most', 'just',
]);

export async function summarizeChunk(content: string, maxTokens: number): Promise<string> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a precise summarizer. Produce a concise summary preserving all key facts, technical terms, numbers, and named entities. Output only the summary text, no preamble.',
      },
      {
        role: 'user',
        content: `Summarize the following text in at most ${maxTokens} tokens:\n\n${content}`,
      },
    ],
    max_tokens: maxTokens,
    temperature: 0,
  });

  return response.choices[0]?.message?.content?.trim() ?? content;
}

export async function summarizeBatch(
  chunks: { content: string; maxTokens: number }[],
): Promise<string[]> {
  const results: string[] = [];
  for (const chunk of chunks) {
    const summary = await summarizeChunk(chunk.content, chunk.maxTokens);
    results.push(summary);
  }
  return results;
}

export function extractKeywords(content: string, maxKeywords = 10): string {
  const words = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);

  return sorted.join(', ');
}
