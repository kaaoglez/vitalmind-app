import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/auth/jwt';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true });

    // Clear the JWT cookie
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
