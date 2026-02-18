/**
 * Format Exporter
 *
 * Exports generated agents to target formats:
 * - Claude Code agent (.md): YAML frontmatter + markdown
 * - Cursor rules (.cursorrules): flat text conventions
 * - System prompt (plain text): role definition + instructions
 */
import type { AgentConfig } from '@agenttailor/shared';

// ── Claude Code agent format ────────────────────────────────────────────────

function exportClaudeAgent(config: AgentConfig): string {
  const parts: string[] = [];

  // YAML frontmatter
  parts.push('---');
  parts.push(`model: ${config.model}`);
  if (config.tools.length > 0) {
    parts.push('tools:');
    for (const tool of config.tools) {
      parts.push(`  - ${tool}`);
    }
  }
  parts.push('---');
  parts.push('');

  // Title
  parts.push(`# ${config.name}`);
  parts.push('');

  // Mission
  parts.push(config.mission);
  parts.push('');

  // Conventions
  if (config.conventions.length > 0) {
    parts.push('## Conventions');
    parts.push('');
    for (const conv of config.conventions) {
      parts.push(`- ${conv}`);
    }
    parts.push('');
  }

  // Context chunks
  if (config.contextChunks.length > 0) {
    for (const chunk of config.contextChunks) {
      parts.push(chunk);
      parts.push('');
    }
  }

  // Source attribution
  if (config.sourceAttribution.length > 0) {
    parts.push('## Sources');
    parts.push('');
    for (const source of config.sourceAttribution) {
      if (source.url) {
        parts.push(`- [${source.name}](${source.url})`);
      } else {
        parts.push(`- ${source.name}`);
      }
    }
    parts.push('');
  }

  return parts.join('\n').trim() + '\n';
}

// ── Cursor rules format ─────────────────────────────────────────────────────

function exportCursorRules(config: AgentConfig): string {
  const parts: string[] = [];

  // Role/mission as opening statement
  parts.push(config.mission);
  parts.push('');

  // Conventions as key principles
  if (config.conventions.length > 0) {
    parts.push('Key Principles:');
    for (const conv of config.conventions) {
      parts.push(`- ${conv}`);
    }
    parts.push('');
  }

  // Context as additional rules
  if (config.contextChunks.length > 0) {
    parts.push('Project Context:');
    for (const chunk of config.contextChunks) {
      // Strip markdown headers for cursor rules format
      const cleaned = chunk.replace(/^#{1,3}\s+/gm, '').trim();
      if (cleaned) {
        parts.push(cleaned);
        parts.push('');
      }
    }
  }

  return parts.join('\n').trim() + '\n';
}

// ── System prompt format ────────────────────────────────────────────────────

function exportSystemPrompt(config: AgentConfig): string {
  const parts: string[] = [];

  // Role definition
  parts.push(`# Role\n\n${config.mission}`);
  parts.push('');

  // Instructions
  if (config.conventions.length > 0) {
    parts.push('# Instructions');
    parts.push('');
    parts.push('Follow these conventions when generating responses:');
    parts.push('');
    for (const conv of config.conventions) {
      parts.push(`- ${conv}`);
    }
    parts.push('');
  }

  // Available tools
  if (config.tools.length > 0) {
    parts.push('# Available Tools');
    parts.push('');
    for (const tool of config.tools) {
      parts.push(`- ${tool}`);
    }
    parts.push('');
  }

  // Context
  if (config.contextChunks.length > 0) {
    parts.push('# Context');
    parts.push('');
    for (const chunk of config.contextChunks) {
      parts.push(chunk);
      parts.push('');
    }
  }

  return parts.join('\n').trim() + '\n';
}

// ── Public API ──────────────────────────────────────────────────────────────

export function exportAgent(config: AgentConfig): string {
  switch (config.format) {
    case 'CLAUDE_AGENT':
      return exportClaudeAgent(config);
    case 'CURSOR_RULES':
      return exportCursorRules(config);
    case 'SYSTEM_PROMPT':
      return exportSystemPrompt(config);
    default:
      return exportClaudeAgent(config);
  }
}

/**
 * Re-export an existing agent content in a different format.
 * Parses the content back into AgentConfig and exports in the new format.
 */
export function reExportAgent(
  config: AgentConfig,
  newFormat: AgentConfig['format'],
): string {
  return exportAgent({ ...config, format: newFormat });
}
