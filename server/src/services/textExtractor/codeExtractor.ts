import type { TextExtractor, ExtractedText } from './types.js';

const extensionToLanguage: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.cs': 'csharp',
  '.sh': 'shell',
  '.bash': 'shell',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.sql': 'sql',
};

export class CodeExtractor implements TextExtractor {
  async extract(buffer: Buffer, filename: string): Promise<ExtractedText> {
    const content = buffer.toString('utf-8');

    // Detect language from file extension
    const dotIndex = filename.lastIndexOf('.');
    const ext = dotIndex !== -1 ? filename.substring(dotIndex).toLowerCase() : '';
    const codeLanguage = extensionToLanguage[ext] ?? 'plaintext';

    return {
      content,
      metadata: {
        codeLanguage,
      },
    };
  }
}
