import { Controller, Get } from '@nestjs/common';

// Auth is intentionally skipped for now (open API). The frontend still calls
// /api/auth/me on boot — return a stub user so the UI proceeds.
@Controller('api/auth')
export class AuthController {
  @Get('me')
  me() {
    return {
      id: 'local-dev-user',
      email: 'dev@brokermind.local',
      full_name: 'Local Dev',
      role: 'admin',
    };
  }
}
