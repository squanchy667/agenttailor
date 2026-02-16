import pdfParse from 'pdf-parse';
import type { TextExtractor, ExtractedText } from './types.js';

export class PdfExtractor implements TextExtractor {
  async extract(buffer: Buffer, _filename: string): Promise<ExtractedText> {
    try {
      const result = await pdfParse(buffer);

      return {
        content: result.text,
        metadata: {
          pageCount: result.numpages,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown PDF parsing error';
      throw new Error(`Failed to extract text from PDF: ${message}`);
    }
  }
}
