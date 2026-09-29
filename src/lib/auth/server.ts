import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || 'https://ep-rough-waterfall-b4abyevf.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth',
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || 'buzzarena_neon_auth_super_secret_cookie_key_32chars!',
    sessionDataTtl: 300,
  },
  logLevel: 'warn',
});
