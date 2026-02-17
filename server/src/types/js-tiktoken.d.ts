declare module 'js-tiktoken' {
  export interface Tiktoken {
    encode(text: string): Uint32Array;
    decode(tokens: Uint32Array): Uint8Array;
    free(): void;
  }

  export function encodingForModel(model: string): Tiktoken;
  export function getEncoding(encoding: string): Tiktoken;
}
