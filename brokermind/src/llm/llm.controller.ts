import { Body, Controller, Post } from '@nestjs/common';
import { OpenAIService, InvokeLLMInput } from '../openai/openai.service';

@Controller('api/llm')
export class LlmController {
  constructor(private openai: OpenAIService) {}

  @Post('invoke')
  async invoke(@Body() body: InvokeLLMInput) {
    return this.openai.invoke(body);
  }
}
