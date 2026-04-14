import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// GET: List all custom music for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const music = await db.customMusic.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ music });
  } catch (error) {
    console.error('Get music error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new custom music link
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { title, url, category } = body;

    if (!title?.trim() || !url?.trim()) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 });
    }

    const music = await db.customMusic.create({
      data: {
        userId,
        title: title.trim(),
        url: url.trim(),
        category: category || 'Meditation',
      },
    });

    return NextResponse.json({ music }, { status: 201 });
  } catch (error) {
    console.error('Create music error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
