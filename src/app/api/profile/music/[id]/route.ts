import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// DELETE: Delete a specific music entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const music = await db.customMusic.findUnique({ where: { id } });
    if (!music || music.userId !== userId) {
      return NextResponse.json({ error: 'Music entry not found' }, { status: 404 });
    }

    await db.customMusic.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete music error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update a specific music entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;

    const music = await db.customMusic.findUnique({ where: { id } });
    if (!music || music.userId !== userId) {
      return NextResponse.json({ error: 'Music entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await db.customMusic.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title.trim() }),
        ...(body.url !== undefined && { url: body.url.trim() }),
        ...(body.category !== undefined && { category: body.category }),
      },
    });

    return NextResponse.json({ music: updated });
  } catch (error) {
    console.error('Update music error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
