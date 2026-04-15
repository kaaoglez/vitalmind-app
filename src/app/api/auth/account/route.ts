import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';

// Same hashing function used across auth routes
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'vitalmind-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// GET /api/auth/account — fetch current user account info
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        language: true,
        darkMode: true,
        plan: true,
        googleId: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Account GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch account' }, { status: 500 });
  }
}

// PUT /api/auth/account — update user account
export async function PUT(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // --- Update profile info (name, phone, avatar) ---
    if (action === 'updateProfile') {
      const { name, phone, avatar } = body;
      const updated = await db.user.update({
        where: { id: payload.userId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(phone !== undefined && { phone: phone.trim() || null }),
          ...(avatar !== undefined && { avatar }),
        },
        select: { id: true, name: true, email: true, phone: true, avatar: true, language: true, darkMode: true, plan: true },
      });
      return NextResponse.json({ user: updated });
    }

    // --- Change email ---
    if (action === 'changeEmail') {
      const { newEmail, password } = body;
      if (!newEmail || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
      }

      // Verify password (only for email/password users)
      if (user.passwordHash) {
        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
          return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Google accounts cannot change email this way' }, { status: 400 });
      }

      // Check if email is already taken
      const existing = await db.user.findUnique({ where: { email: newEmail.trim().toLowerCase() } });
      if (existing && existing.id !== payload.userId) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
      }

      const updated = await db.user.update({
        where: { id: payload.userId },
        data: { email: newEmail.trim().toLowerCase() },
        select: { id: true, name: true, email: true, phone: true, avatar: true, language: true, darkMode: true, plan: true },
      });

      return NextResponse.json({ user: updated });
    }

    // --- Change password ---
    if (action === 'changePassword') {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }

      if (!user.passwordHash) {
        return NextResponse.json({ error: 'Google accounts cannot set a password this way' }, { status: 400 });
      }

      const currentHash = await hashPassword(currentPassword);
      if (user.passwordHash !== currentHash) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id: payload.userId },
        data: { passwordHash: newHash },
      });

      return NextResponse.json({ success: true });
    }

    // --- Update preferences (language, darkMode) ---
    if (action === 'updatePreferences') {
      const { language, darkMode } = body;
      const updated = await db.user.update({
        where: { id: payload.userId },
        data: {
          ...(language !== undefined && { language }),
          ...(darkMode !== undefined && { darkMode }),
        },
        select: { id: true, name: true, email: true, phone: true, avatar: true, language: true, darkMode: true, plan: true },
      });
      return NextResponse.json({ user: updated });
    }

    // --- Delete account ---
    if (action === 'deleteAccount') {
      const { password } = body;

      // Require password for email/password users
      if (user.passwordHash) {
        if (!password) {
          return NextResponse.json({ error: 'Password is required to delete account' }, { status: 400 });
        }
        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
          return NextResponse.json({ error: 'Incorrect password' }, { status: 400 });
        }
      }

      // Delete all user data (cascading)
      await db.user.delete({ where: { id: payload.userId } });

      // Clear cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
      return response;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Account PUT error:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}
