import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

export interface InvokeLLMInput {
  prompt: string;
  response_json_schema?: Record<string, any>;
  model?: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private readonly client: OpenAI;
  private readonly defaultModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async invoke({ prompt, response_json_schema, model }: InvokeLLMInput): Promise<any> {
    const wantsJson = !!response_json_schema;
    const systemMsg = wantsJson
      ? 'You output strict JSON only. No prose, no code fences. The JSON must match the schema described in the user prompt.'
      : 'You are a helpful assistant. Respond in plain text.';

    try {
      const completion = await this.client.chat.completions.create({
        model: model || this.defaultModel,
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
        ...(wantsJson ? { response_format: { type: 'json_object' as const } } : {}),
        temperature: 0.2,
      });

      const text = completion.choices?.[0]?.message?.content || '';

      if (wantsJson) {
        const cleaned = text.replace(/```json|```/g, '').trim();
        try {
          return JSON.parse(cleaned);
        } catch (e) {
          this.logger.warn(`JSON parse failed: ${(e as Error).message}; raw=${cleaned.slice(0, 200)}`);
          return { _raw: cleaned };
        }
      }
      return text;
    } catch (e) {
      this.logger.error(`OpenAI error: ${(e as Error).message}`);
      throw e;
    }
  }
}
