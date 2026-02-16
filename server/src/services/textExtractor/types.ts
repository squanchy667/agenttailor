export interface ExtractedText {
  content: string;
  metadata?: {
    pageCount?: number;
    language?: string;
    codeLanguage?: string;
    hasHeadings?: boolean;
  };
}

export interface TextExtractor {
  extract(buffer: Buffer, filename: string): Promise<ExtractedText>;
}
