import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { signToken, COOKIE_NAME, getTokenMaxAge } from '@/lib/auth/jwt';

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified?: boolean;
}

async function verifyGoogleToken(token: string): Promise<GoogleUserInfo | null> {
  try {
    // Use Google's tokeninfo endpoint to verify the ID token
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      console.error('Google token verification failed:', response.status);
      return null;
    }

    const payload = await response.json();

    // Verify the audience matches our client ID
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (clientId && payload.aud !== clientId) {
      console.error('Google token audience mismatch');
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      email_verified: payload.email_verified,
    };
  } catch (error) {
    console.error('Google token verification error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Google token is required' }, { status: 400 });
    }

    // Verify the Google token
    const googleUser = await verifyGoogleToken(token);
    if (!googleUser || !googleUser.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    // Find or create the user
    let user;

    // First, try to find by googleId
    user = await db.user.findUnique({ where: { googleId: googleUser.sub } });

    if (!user) {
      // Try to find by email (user might have registered with email/password before)
      user = await db.user.findUnique({ where: { email: googleUser.email } });

      if (user) {
        // Link Google account to existing user
        user = await db.user.update({
          where: { id: user.id },
          data: {
            googleId: googleUser.sub,
            avatar: googleUser.picture || user.avatar,
          },
        });
      } else {
        // Create new user with Google info
        user = await db.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.sub,
            avatar: googleUser.picture || null,
            passwordHash: null,
            wellnessData: {
              create: {},
            },
          },
        });
      }
    } else {
      // Update avatar if changed
      if (googleUser.picture && user.avatar !== googleUser.picture) {
        user = await db.user.update({
          where: { id: user.id },
          data: { avatar: googleUser.picture },
        });
      }
    }

    // Create JWT token
    const jwtToken = await signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        language: user.language,
        darkMode: user.darkMode,
        plan: user.plan,
      },
    });

    // Set httpOnly cookie
    response.cookies.set(COOKIE_NAME, jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: getTokenMaxAge(),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
