import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// DELETE: Delete a specific activity log
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

    const activity = await db.activityLog.findUnique({ where: { id } });
    if (!activity || activity.userId !== userId) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    await db.activityLog.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update a specific activity log
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

    const activity = await db.activityLog.findUnique({ where: { id } });
    if (!activity || activity.userId !== userId) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await db.activityLog.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.calories !== undefined && { calories: body.calories }),
        ...(body.caloriesBurned !== undefined && { caloriesBurned: body.caloriesBurned }),
      },
    });

    return NextResponse.json({ activity: updated });
  } catch (error) {
    console.error('Update activity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
