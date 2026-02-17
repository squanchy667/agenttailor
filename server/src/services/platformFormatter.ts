/**
 * Platform-specific context formatter
 *
 * ChatGPT: Markdown sections with headers, source attribution, no XML tags
 * Claude:  XML tags (<project_docs>, <web_research>, <task_analysis>) per Claude's recommended format
 */
import type { SynthesizedContext, SynthesizedBlock } from '@agenttailor/shared';

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3);
}

function buildSourceLine(block: SynthesizedBlock): string {
  if (block.sources.length === 0) return '';
  const parts = block.sources.map((s) => {
    if (s.url) return `[${s.title}](${s.url})`;
    return s.title;
  });
  return `_Sources: ${parts.join(', ')}_`;
}

function buildRelevanceIndicator(block: SynthesizedBlock): string {
  const score = block.priority;
  if (score >= 0.8) return '🔴 High relevance';
  if (score >= 0.5) return '🟡 Medium relevance';
  return '🟢 Low relevance';
}

// ── ChatGPT: Markdown-based formatting ──────────────────────────────────────

function formatForChatGPT(context: SynthesizedContext): string {
  if (context.blocks.length === 0) {
    return '## Context\n\n_No relevant context found for this task._';
  }

  const sectionMap = new Map<string, SynthesizedBlock[]>();
  for (const block of context.blocks) {
    const existing = sectionMap.get(block.section) ?? [];
    existing.push(block);
    sectionMap.set(block.section, existing);
  }

  const parts: string[] = [];

  parts.push('## Project Context\n');
  parts.push(`_${context.sourceCount} source(s) · ${context.totalTokenCount} tokens_\n`);

  for (const [section, blocks] of sectionMap) {
    parts.push(`### ${section}\n`);

    for (const block of blocks) {
      parts.push(block.content);
      parts.push('');

      const sourceLine = buildSourceLine(block);
      if (sourceLine) {
        parts.push(sourceLine);
        parts.push('');
      }

      if (block.contradictions && block.contradictions.length > 0) {
        parts.push(
          `> **Note:** This section has ${block.contradictions.length} potential contradiction(s). Verify before use.`,
        );
        parts.push('');
      }
    }
  }

  if (context.contradictionCount > 0) {
    parts.push(
      `---\n_⚠️ ${context.contradictionCount} potential contradiction(s) detected across sources._`,
    );
  }

  return parts.join('\n').trim();
}

// ── Claude: XML tag-based formatting ─────────────────────────────────────────

function formatForClaude(context: SynthesizedContext): string {
  if (context.blocks.length === 0) {
    return '<project_docs>\nNo relevant context found for this task.\n</project_docs>';
  }

  const projectBlocks: SynthesizedBlock[] = [];
  const webBlocks: SynthesizedBlock[] = [];

  for (const block of context.blocks) {
    const isWeb = block.sources.some((s) => s.sourceType === 'WEB_SEARCH');
    if (isWeb) {
      webBlocks.push(block);
    } else {
      projectBlocks.push(block);
    }
  }

  const parts: string[] = [];

  // Project documentation section
  if (projectBlocks.length > 0) {
    parts.push('<project_docs>');

    const sectionMap = new Map<string, SynthesizedBlock[]>();
    for (const block of projectBlocks) {
      const existing = sectionMap.get(block.section) ?? [];
      existing.push(block);
      sectionMap.set(block.section, existing);
    }

    for (const [section, blocks] of sectionMap) {
      parts.push(`  <section name="${section}">`);
      for (const block of blocks) {
        parts.push('    <document>');
        const sourceLine = buildSourceLine(block);
        if (sourceLine) {
          parts.push(`      <source>${block.sources.map((s) => s.title).join(', ')}</source>`);
          if (block.sources[0]?.url) {
            parts.push(`      <url>${block.sources[0].url}</url>`);
          }
        }
        parts.push(`      <relevance>${buildRelevanceIndicator(block)}</relevance>`);
        parts.push('      <content>');
        parts.push(`        ${block.content.split('\n').join('\n        ')}`);
        parts.push('      </content>');
        if (block.contradictions && block.contradictions.length > 0) {
          parts.push(
            `      <warning>Contains ${block.contradictions.length} potential contradiction(s) — verify before use.</warning>`,
          );
        }
        parts.push('    </document>');
      }
      parts.push('  </section>');
    }

    parts.push('</project_docs>');
  }

  // Web research section
  if (webBlocks.length > 0) {
    parts.push('<web_research>');
    for (const block of webBlocks) {
      parts.push('  <result>');
      if (block.sources[0]) {
        parts.push(`    <title>${block.sources[0].title}</title>`);
        if (block.sources[0].url) {
          parts.push(`    <url>${block.sources[0].url}</url>`);
        }
      }
      parts.push('    <content>');
      parts.push(`      ${block.content.split('\n').join('\n      ')}`);
      parts.push('    </content>');
      parts.push('  </result>');
    }
    parts.push('</web_research>');
  }

  // Task analysis summary
  parts.push('<task_analysis>');
  parts.push(`  <total_sources>${context.sourceCount}</total_sources>`);
  parts.push(`  <total_tokens>${context.totalTokenCount}</total_tokens>`);
  if (context.contradictionCount > 0) {
    parts.push(
      `  <contradictions_detected>${context.contradictionCount}</contradictions_detected>`,
    );
  }
  parts.push(`  <sections>${context.sections.join(', ')}</sections>`);
  parts.push('</task_analysis>');

  return parts.join('\n');
}

// ── Public API ─────────────────────────────────────────────────────────────

export function formatContext(synthesizedContext: SynthesizedContext, platform: string): string {
  const normalised = platform.toLowerCase();
  if (normalised === 'claude') {
    return formatForClaude(synthesizedContext);
  }
  // Default: ChatGPT / Markdown
  return formatForChatGPT(synthesizedContext);
}

/**
 * Extract per-section stats from a SynthesizedContext for the TailorResponse.
 */
export function extractSections(
  synthesizedContext: SynthesizedContext,
  _formattedContext: string,
): Array<{ name: string; content: string; tokenCount: number; sourceCount: number }> {
  const sectionMap = new Map<
    string,
    { blocks: SynthesizedBlock[]; sourceIds: Set<string> }
  >();

  for (const block of synthesizedContext.blocks) {
    const entry = sectionMap.get(block.section) ?? { blocks: [], sourceIds: new Set() };
    entry.blocks.push(block);
    for (const source of block.sources) {
      entry.sourceIds.add(source.sourceId);
    }
    sectionMap.set(block.section, entry);
  }

  return Array.from(sectionMap.entries()).map(([name, { blocks, sourceIds }]) => {
    const content = blocks.map((b) => b.content).join('\n\n');
    return {
      name,
      content,
      tokenCount: estimateTokens(content),
      sourceCount: sourceIds.size,
    };
  });
}
