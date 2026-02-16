import mammoth from 'mammoth';
import type { TextExtractor, ExtractedText } from './types.js';

export class DocxExtractor implements TextExtractor {
  async extract(buffer: Buffer, _filename: string): Promise<ExtractedText> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const content = result.value;

      // Detect headings by checking if the document had any structural elements
      // mammoth raw text doesn't preserve heading markers, so we check the HTML output
      const htmlResult = await mammoth.convertToHtml({ buffer });
      const hasHeadings = /<h[1-6]\b/i.test(htmlResult.value);

      return {
        content,
        metadata: {
          hasHeadings,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown DOCX parsing error';
      throw new Error(`Failed to extract text from DOCX: ${message}`);
    }
  }
}
