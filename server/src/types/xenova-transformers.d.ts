declare module '@xenova/transformers' {
  export function pipeline(
    task: string,
    model: string,
  ): Promise<(input: string | string[], options?: Record<string, unknown>) => Promise<{ tolist: () => number[][] }>>;
}
