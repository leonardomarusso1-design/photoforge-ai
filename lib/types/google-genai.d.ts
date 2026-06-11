declare module "@google/genai" {
  export class GoogleGenAI {
    constructor(options?: { apiKey?: string });
    models: {
      generateContent(args: { model: string; contents: unknown }): Promise<{
        candidates?: Array<{
          content?: {
            parts?: unknown[];
          };
        }>;
      }>;
    };
  }
}
