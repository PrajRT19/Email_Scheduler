import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { User } from '../types/api.js';
import { ValidationError, InternalError } from '../utils/errors.js';

export interface GoogleProfile {
  email: string;
  name: string;
  picture?: string | null;
}

export function getGoogleAuthUrl(): string {
  // If mock credentials in development/test, redirect directly to callback with mock code
  if (env.GOOGLE_CLIENT_ID === 'mock-google-client-id') {
    return `${env.GOOGLE_CALLBACK_URL}?code=mock-dev-code`;
  }

  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    client_id: env.GOOGLE_CLIENT_ID,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function exchangeCodeForGoogleProfile(code: string): Promise<GoogleProfile> {
  if (!code) {
    throw new ValidationError('Missing authorization code');
  }

  // Handle mock development flow
  if (code === 'mock-dev-code' || env.GOOGLE_CLIENT_ID === 'mock-google-client-id') {
    return {
      email: 'oliver.brown@domain.io',
      name: 'Oliver Brown',
      picture: null,
    };
  }

  try {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const values = {
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code',
    };

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(values).toString(),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !tokenData.access_token) {
      logger.error({ tokenData }, 'Failed to exchange Google OAuth code');
      throw new ValidationError('Failed to authenticate with Google');
    }

    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = (await userinfoRes.json()) as any;
    if (!userinfoRes.ok || !profileData.email) {
      logger.error({ profileData }, 'Failed to fetch Google user profile');
      throw new ValidationError('Failed to fetch user profile from Google');
    }

    return {
      email: profileData.email,
      name: profileData.name || profileData.email.split('@')[0],
      picture: profileData.picture || null,
    };
  } catch (err: any) {
    if (err instanceof ValidationError) throw err;
    logger.error({ err }, 'Google OAuth exchange error');
    throw new InternalError('Failed to process Google authentication');
  }
}

export async function upsertGoogleUser(profile: GoogleProfile): Promise<User> {
  const user = await prisma.user.upsert({
    where: { email: profile.email },
    update: {
      name: profile.name,
      avatarUrl: profile.picture ?? undefined,
    },
    create: {
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture ?? null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  });

  return user;
}
