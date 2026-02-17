import type { Citation } from '@agenttailor/shared';

/**
 * Format a numbered "Sources" section from a list of citations.
 *
 * Output format:
 * ```
 * ---
 * Sources:
 * [1] Document: "API Guide"
 * [2] Web: "OAuth2 Best Practices" — https://example.com/oauth2
 * ```
 */
export function formatCitationsSection(citations: Citation[]): string {
  const lines: string[] = ['---', 'Sources:'];

  for (const citation of citations) {
    const n = citation.id;
    if (citation.type === 'document') {
      lines.push(`[${n}] Document: "${citation.sourceTitle}"`);
    } else {
      const urlPart = citation.sourceUrl ? ` — ${citation.sourceUrl}` : '';
      lines.push(`[${n}] Web: "${citation.sourceTitle}"${urlPart}`);
    }
  }

  return lines.join('\n');
}
