/**
 * Heading-based chunker - splits exclusively on markdown headings
 * Each section becomes a chunk; falls back to semantic chunker for oversized sections
 */
import type { ChunkConfig, ChunkMetadata, ProcessedChunk } from '@agenttailor/shared';
import { semanticChunk } from './semantic-chunker.js';

/**
 * Estimate token count using word-based approximation
 */
function estimateTokens(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.3);
}

/**
 * Extract heading level from markdown heading line
 */
function getHeadingLevel(line: string): number | null {
  const match = line.match(/^(#{1,6})\s+/);
  if (!match) return null;
  const hashes = match[1];
  return hashes ? hashes.length : null;
}

/**
 * Extract heading text (without # markers)
 */
function getHeadingText(line: string): string {
  return line.replace(/^#{1,6}\s+/, '').trim();
}

interface Section {
  heading: string;
  level: number;
  content: string;
}

/**
 * Parse document into sections based on headings
 */
function parseIntoSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const line of lines) {
    const level = getHeadingLevel(line);

    if (level !== null) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        heading: getHeadingText(line),
        level,
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    } else {
      // Content before first heading
      currentSection = {
        heading: '__preamble__',
        level: 0,
        content: line,
      };
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Build heading breadcrumb from section hierarchy
 */
function buildBreadcrumb(sections: Section[], currentIndex: number): string[] {
  const current = sections[currentIndex];
  if (!current) return [];

  const breadcrumb: string[] = [];
  const currentLevel = current.level;

  for (let i = currentIndex; i >= 0; i--) {
    const section = sections[i];
    if (!section || section.heading === '__preamble__') continue;

    if (section.level < currentLevel || i === currentIndex) {
      breadcrumb.unshift(section.heading);
      if (section.level === 1) break;
    }
  }

  return breadcrumb;
}

/**
 * Heading-based chunking implementation
 * Splits on markdown headings, preserves section boundaries
 */
export function headingChunk(text: string, config: ChunkConfig): ProcessedChunk[] {
  const chunks: ProcessedChunk[] = [];
  const maxTokens = config.maxTokens ?? 512;
  const minTokens = config.minTokens ?? 50;

  const sections = parseIntoSections(text);
  if (sections.length === 0) return chunks;

  let position = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    if (!section) continue;

    const sectionContent = section.content.trim();
    if (!sectionContent) continue;

    const tokenCount = estimateTokens(sectionContent);
    const breadcrumb = buildBreadcrumb(sections, i);

    if (tokenCount <= maxTokens) {
      if (tokenCount >= minTokens) {
        const metadata: ChunkMetadata = {
          headings: breadcrumb.length > 0 ? breadcrumb : undefined,
          section: section.heading !== '__preamble__' ? section.heading : undefined,
        };

        chunks.push({
          content: sectionContent,
          position,
          tokenCount,
          metadata,
        });

        position++;
      }
    } else {
      // Section too large - fall back to semantic chunking
      const subChunks = semanticChunk(sectionContent, config);

      for (const subChunk of subChunks) {
        chunks.push({
          ...subChunk,
          position,
          metadata: {
            ...subChunk.metadata,
            headings: breadcrumb.length > 0 ? breadcrumb : subChunk.metadata.headings,
            section: section.heading !== '__preamble__' ? section.heading : undefined,
          },
        });

        position++;
      }
    }
  }

  return chunks;
}
