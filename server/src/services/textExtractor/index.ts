import type { TextExtractor } from './types.js';
import { PdfExtractor } from './pdfExtractor.js';
import { DocxExtractor } from './docxExtractor.js';
import { MarkdownExtractor } from './markdownExtractor.js';
import { CodeExtractor } from './codeExtractor.js';

export type { ExtractedText, TextExtractor } from './types.js';

const extensionMap: Record<string, TextExtractor> = {
  '.pdf': new PdfExtractor(),
  '.docx': new DocxExtractor(),
  '.md': new MarkdownExtractor(),
  '.markdown': new MarkdownExtractor(),
  '.txt': new MarkdownExtractor(), // plain text uses same extractor
};

const codeExtensions = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java',
  '.c', '.cpp', '.h', '.rb', '.php', '.swift', '.kt', '.cs',
  '.sh', '.bash', '.yaml', '.yml', '.json', '.xml', '.html',
  '.css', '.scss', '.sql',
];

const codeExtractor = new CodeExtractor();

export function getExtractor(filename: string): TextExtractor | null {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const ext = filename.substring(dotIndex).toLowerCase();

  const extractor = extensionMap[ext];
  if (extractor) return extractor;

  if (codeExtensions.includes(ext)) return codeExtractor;

  return null;
}
