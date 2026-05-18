import { Global, Module } from '@nestjs/common';
import { GmailAuthController } from './gmail-auth.controller';
import { GmailAuthService } from './gmail-auth.service';

@Global()
@Module({
  controllers: [GmailAuthController],
  providers:   [GmailAuthService],
  exports:     [GmailAuthService],
})
export class GmailAuthModule {}
