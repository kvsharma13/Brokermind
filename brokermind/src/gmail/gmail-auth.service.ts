import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE = path.join(process.cwd(), '.gmail-tokens.json');

@Injectable()
export class GmailAuthService {
  private clientId()     { return process.env.GMAIL_CLIENT_ID || ''; }
  private clientSecret() { return process.env.GMAIL_CLIENT_SECRET || ''; }
  private redirectUri()  {
    return process.env.GMAIL_REDIRECT_URI || 'http://localhost:4000/api/auth/gmail/callback';
  }

  isConfigured(): boolean {
    return !!(this.clientId() && this.clientSecret());
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id:     this.clientId(),
      redirect_uri:  this.redirectUri(),
      response_type: 'code',
      scope:         'https://www.googleapis.com/auth/gmail.readonly',
      access_type:   'offline',
      prompt:        'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<void> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     this.clientId(),
        client_secret: this.clientSecret(),
        redirect_uri:  this.redirectUri(),
        grant_type:    'authorization_code',
      }),
    });
    const data: any = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    this.saveTokens({
      ...data,
      expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
    });
  }

  async getAccessToken(): Promise<string | null> {
    const tokens = this.loadTokens();

    // Token file exists and is still valid
    if (tokens?.expiry_date && tokens.expiry_date > Date.now() + 300_000) {
      return tokens.access_token;
    }

    // Refresh using token file's refresh_token
    if (tokens?.refresh_token) {
      return this.refresh(tokens.refresh_token);
    }

    // Fallback: use GMAIL_REFRESH_TOKEN env var (Railway / hardcoded setup)
    const envRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
    if (envRefreshToken) {
      return this.refreshFromEnv(envRefreshToken);
    }

    return process.env.GMAIL_ACCESS_TOKEN || null;
  }

  private async refresh(refreshToken: string): Promise<string | null> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token:  refreshToken,
        client_id:      this.clientId(),
        client_secret:  this.clientSecret(),
        grant_type:     'refresh_token',
      }),
    });
    const data: any = await res.json();
    if (data.error) return null;
    const existing = this.loadTokens() || {};
    this.saveTokens({
      ...existing,
      access_token: data.access_token,
      expiry_date:  Date.now() + (data.expires_in || 3600) * 1000,
    });
    return data.access_token;
  }

  private async refreshFromEnv(refreshToken: string): Promise<string | null> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token:  refreshToken,
        client_id:      this.clientId(),
        client_secret:  this.clientSecret(),
        grant_type:     'refresh_token',
      }),
    });
    const data: any = await res.json();
    if (data.error) return null;
    return data.access_token || null;
  }

  getConnectedEmail(): string {
    return this.loadTokens()?.email || process.env.GMAIL_CONNECTED_EMAIL || '';
  }

  setConnectedEmail(email: string): void {
    const tokens = this.loadTokens() || {};
    this.saveTokens({ ...tokens, email });
  }

  disconnect(): void {
    if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
  }

  private saveTokens(tokens: any): void {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  }

  private loadTokens(): any {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    try { return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')); }
    catch { return null; }
  }
}
