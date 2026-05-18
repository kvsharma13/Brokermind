import { Controller, Get, Query, Redirect, Res } from '@nestjs/common';
import { Response } from 'express';
import { GmailAuthService } from './gmail-auth.service';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3001';

@Controller('api/auth/gmail')
export class GmailAuthController {
  constructor(private gmailAuth: GmailAuthService) {}

  @Get('connect')
  @Redirect()
  connect() {
    return { url: this.gmailAuth.getAuthUrl() };
  }

  @Get('callback')
  async callback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    if (error || !code) {
      return res.redirect(`${FRONTEND}/?gmail_error=${encodeURIComponent(error || 'no_code')}`);
    }
    try {
      await this.gmailAuth.exchangeCode(code);
      const token = await this.gmailAuth.getAccessToken();
      if (token) {
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile: any = await r.json();
        if (profile.emailAddress) this.gmailAuth.setConnectedEmail(profile.emailAddress);
      }
      return res.redirect(`${FRONTEND}/?gmail_connected=1`);
    } catch (e) {
      return res.redirect(`${FRONTEND}/?gmail_error=${encodeURIComponent((e as Error).message)}`);
    }
  }

  @Get('status')
  status() {
    return {
      configured:      this.gmailAuth.isConfigured(),
      connected_email: this.gmailAuth.getConnectedEmail(),
    };
  }

  @Get('debug-token')
  async debugToken() {
    return this.gmailAuth.debugGetToken();
  }

  @Get('disconnect')
  disconnect() {
    this.gmailAuth.disconnect();
    return { success: true };
  }
}
