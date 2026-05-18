import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { OpenAIModule } from './openai/openai.module';
import { EntitiesModule } from './entities/entities.module';
import { LlmModule } from './llm/llm.module';
import { AuthModule } from './auth/auth.module';
import { FunctionsModule } from './functions/functions.module';
import { GmailAuthModule } from './gmail/gmail-auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OpenAIModule,
    EntitiesModule,
    LlmModule,
    AuthModule,
    GmailAuthModule,
    FunctionsModule,
  ],
})
export class AppModule {}
