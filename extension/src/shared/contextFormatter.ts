/**
 * Context formatting utilities for AI-readable injection
 */

/**
 * Wraps raw context in a clear delimited format suitable for injection into
 * the AI chat input. Both platforms accept Markdown. The Claude variant uses
 * an XML-friendly wrapper that blends naturally with Claude's preferred style.
 */
export function formatContextForInjection(
  context: string,
  platform: 'chatgpt' | 'claude',
): string {
  const body = context.trim();

  if (platform === 'claude') {
    // Claude-friendly: XML wrapper for clean document boundary
    return `<context source="AgentTailor">
${body}
</context>

`;
  }

  // ChatGPT-friendly: Markdown-delimited block
  return `---
[Context provided by AgentTailor]

${body}

---

`;
}
