import type { TextExtractor, ExtractedText } from './types.js';

export class MarkdownExtractor implements TextExtractor {
  async extract(buffer: Buffer, _filename: string): Promise<ExtractedText> {
    let content = buffer.toString('utf-8');

    const metadata: ExtractedText['metadata'] = {};

    // Parse and strip frontmatter if present (lines between --- delimiters at start)
    if (content.startsWith('---')) {
      const endIndex = content.indexOf('---', 3);
      if (endIndex !== -1) {
        // Skip the frontmatter section (including both --- delimiters and trailing newline)
        content = content.substring(endIndex + 3).trimStart();
      }
    }

    // Detect markdown headings
    if (/^#{1,6}\s+.+$/m.test(content)) {
      metadata.hasHeadings = true;
    }

    return {
      content,
      metadata,
    };
  }
}
