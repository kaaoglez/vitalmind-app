import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// DELETE: Delete a specific exercise
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

    const exercise = await db.customExercise.findUnique({ where: { id } });
    if (!exercise || exercise.userId !== userId) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    await db.customExercise.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete exercise error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update a specific exercise
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

    const exercise = await db.customExercise.findUnique({ where: { id } });
    if (!exercise || exercise.userId !== userId) {
      return NextResponse.json({ error: 'Exercise not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await db.customExercise.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.duration !== undefined && { duration: body.duration }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.caloriesBurned !== undefined && { caloriesBurned: body.caloriesBurned }),
      },
    });

    return NextResponse.json({ exercise: updated });
  } catch (error) {
    console.error('Update exercise error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
