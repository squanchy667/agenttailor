/**
 * Config Parser
 *
 * Parses and normalizes different agent config formats into a unified schema:
 * - Claude Code agents: YAML frontmatter + markdown body
 * - Cursor rules: plain text conventions with file glob patterns
 * - System prompts: raw instruction text with role/rules/examples
 */
import type { ParsedConfig, ConfigSourceFormat } from '@agenttailor/shared';

// ── YAML frontmatter extraction ─────────────────────────────────────────────

const FRONTMATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
const YAML_KV_RE = /^(\w[\w-]*):\s*(.+)$/gm;
const YAML_LIST_RE = /^(\w[\w-]*):\s*\n((?:\s+-\s+.+\n?)+)/gm;

function parseYamlFrontmatter(content: string): { meta: Record<string, string | string[]>; body: string } {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return { meta: {}, body: content };

  const rawYaml = match[1]!;
  const body = match[2]!;
  const meta: Record<string, string | string[]> = {};

  // Parse list values (tools:, etc.)
  let listMatch;
  const listRe = new RegExp(YAML_LIST_RE.source, 'gm');
  while ((listMatch = listRe.exec(rawYaml)) !== null) {
    const key = listMatch[1]!;
    const items = listMatch[2]!
      .split('\n')
      .map((line) => line.replace(/^\s*-\s*/, '').trim())
      .filter(Boolean);
    meta[key] = items;
  }

  // Parse key-value pairs
  let kvMatch;
  const kvRe = new RegExp(YAML_KV_RE.source, 'gm');
  while ((kvMatch = kvRe.exec(rawYaml)) !== null) {
    const key = kvMatch[1]!;
    if (!(key in meta)) {
      meta[key] = kvMatch[2]!.trim();
    }
  }

  return { meta, body };
}

// ── Section extraction ──────────────────────────────────────────────────────

const SECTION_RE = /^#{1,3}\s+(.+)/gm;

function extractSections(text: string): string[] {
  const sections: string[] = [];
  let match;
  while ((match = SECTION_RE.exec(text)) !== null) {
    sections.push(match[1]!.trim());
  }
  return sections;
}

// ── Convention extraction ───────────────────────────────────────────────────

const BULLET_RE = /^[\s]*[-*]\s+(.+)/gm;
const NUMBERED_RE = /^[\s]*\d+[.)]\s+(.+)/gm;

function extractBulletItems(text: string): string[] {
  const items: string[] = [];
  let match;

  const bulletRe = new RegExp(BULLET_RE.source, 'gm');
  while ((match = bulletRe.exec(text)) !== null) {
    const item = match[1]!.trim();
    if (item.length > 10 && item.length < 500) {
      items.push(item);
    }
  }

  const numberedRe = new RegExp(NUMBERED_RE.source, 'gm');
  while ((match = numberedRe.exec(text)) !== null) {
    const item = match[1]!.trim();
    if (item.length > 10 && item.length < 500) {
      items.push(item);
    }
  }

  return items;
}

// ── Code example extraction ─────────────────────────────────────────────────

const CODE_BLOCK_RE = /```[\s\S]*?```/g;

function extractCodeExamples(text: string): string[] {
  const matches = text.match(CODE_BLOCK_RE) ?? [];
  return matches
    .map((m) => m.replace(/^```\w*\n?/, '').replace(/\n?```$/, '').trim())
    .filter((m) => m.length > 5 && m.length < 2000);
}

// ── File pattern extraction ─────────────────────────────────────────────────

const GLOB_RE = /(?:^|\s)((?:\*\*\/)?[\w*]+(?:\.[\w*]+)+)/gm;
const FILE_EXT_RE = /\*\.(?:ts|tsx|js|jsx|py|rs|go|java|css|scss|md|json|yaml|yml|toml)\b/g;

function extractFilePatterns(text: string): string[] {
  const patterns = new Set<string>();

  let match;
  const globRe = new RegExp(GLOB_RE.source, 'gm');
  while ((match = globRe.exec(text)) !== null) {
    patterns.add(match[1]!.trim());
  }

  const extRe = new RegExp(FILE_EXT_RE.source, 'g');
  while ((match = extRe.exec(text)) !== null) {
    patterns.add(match[0]);
  }

  return Array.from(patterns);
}

// ── Role detection ──────────────────────────────────────────────────────────

const ROLE_PATTERNS = [
  /you are (?:a |an )?(.+?)(?:\.|,|\n|$)/i,
  /role:\s*(.+?)(?:\n|$)/i,
  /agent:\s*(.+?)(?:\n|$)/i,
  /as (?:a |an )?(.+?)(?:,| you)/i,
];

function detectRole(text: string): string | undefined {
  for (const pattern of ROLE_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const role = match[1].trim();
      if (role.length > 3 && role.length < 200) return role;
    }
  }
  return undefined;
}

// ── Format-specific parsers ─────────────────────────────────────────────────

function parseClaudeAgent(content: string): ParsedConfig {
  const { meta, body } = parseYamlFrontmatter(content);

  const tools = Array.isArray(meta['tools']) ? meta['tools'] : [];
  const model = typeof meta['model'] === 'string' ? meta['model'] : undefined;

  const conventions = extractBulletItems(body);
  const examples = extractCodeExamples(body);
  const filePatterns = extractFilePatterns(body);
  const role = (typeof meta['role'] === 'string' ? meta['role'] : undefined) ?? detectRole(body);

  return {
    role: role ?? (model ? `Claude ${model} agent` : undefined),
    conventions,
    tools,
    examples,
    filePatterns,
    raw: content,
  };
}

function parseCursorRules(content: string): ParsedConfig {
  const conventions = extractBulletItems(content);
  const examples = extractCodeExamples(content);
  const filePatterns = extractFilePatterns(content);
  const role = detectRole(content);

  // Cursor rules are typically flat-text conventions
  // If few bullets found, split by newlines and use non-empty lines as conventions
  if (conventions.length < 3) {
    const lines = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15 && !l.startsWith('#') && !l.startsWith('```'));
    conventions.push(...lines.slice(0, 50));
  }

  return {
    role,
    conventions,
    tools: [],
    examples,
    filePatterns,
    raw: content,
  };
}

function parseSystemPrompt(content: string): ParsedConfig {
  const conventions = extractBulletItems(content);
  const examples = extractCodeExamples(content);
  const role = detectRole(content);
  const filePatterns = extractFilePatterns(content);

  // Detect structure: look for sections
  const sections = extractSections(content);
  const tools: string[] = [];

  // Check if there's a tools section
  const toolsSectionIdx = sections.findIndex((s) =>
    /tool|function|action/i.test(s),
  );
  if (toolsSectionIdx >= 0) {
    // Extract tool names from bullets after the tools header
    const toolsHeader = sections[toolsSectionIdx]!;
    const headerIdx = content.indexOf(toolsHeader);
    if (headerIdx >= 0) {
      const afterHeader = content.slice(headerIdx + toolsHeader.length);
      const nextSection = afterHeader.indexOf('\n#');
      const toolsSection = nextSection >= 0 ? afterHeader.slice(0, nextSection) : afterHeader;
      const toolItems = extractBulletItems(toolsSection);
      tools.push(...toolItems.map((t) => t.split(/[:(]/)[0]!.trim()));
    }
  }

  return {
    role,
    conventions,
    tools,
    examples,
    filePatterns,
    raw: content,
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function parseConfig(content: string, format: ConfigSourceFormat): ParsedConfig {
  switch (format) {
    case 'claude-agent':
      return parseClaudeAgent(content);
    case 'cursor-rules':
      return parseCursorRules(content);
    case 'system-prompt':
    case 'custom-gpt':
      return parseSystemPrompt(content);
    default:
      return parseSystemPrompt(content);
  }
}

/**
 * Auto-detect the format of a config file based on content heuristics.
 */
export function detectConfigFormat(content: string): ConfigSourceFormat {
  // Claude agent: has YAML frontmatter with model/tools
  if (FRONTMATTER_RE.test(content)) {
    const { meta } = parseYamlFrontmatter(content);
    if (meta['model'] || meta['tools']) return 'claude-agent';
  }

  // Cursor rules: typically starts with conventions or "You are" and has file patterns
  if (/\.cursorrules/i.test(content) || /file.?pattern|glob/i.test(content)) {
    return 'cursor-rules';
  }

  // Default to system prompt
  return 'system-prompt';
}
