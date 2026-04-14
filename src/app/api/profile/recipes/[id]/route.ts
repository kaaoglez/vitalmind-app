import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, COOKIE_NAME } from '@/lib/auth/jwt';

async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return payload?.userId ?? null;
}

// DELETE: Delete a specific recipe
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

    const recipe = await db.customRecipe.findUnique({ where: { id } });
    if (!recipe || recipe.userId !== userId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    await db.customRecipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete recipe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: Update a specific recipe
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

    const recipe = await db.customRecipe.findUnique({ where: { id } });
    if (!recipe || recipe.userId !== userId) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const body = await request.json();
    const updated = await db.customRecipe.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.ingredients !== undefined && { ingredients: body.ingredients }),
        ...(body.steps !== undefined && { steps: body.steps }),
        ...(body.time !== undefined && { time: body.time }),
        ...(body.calories !== undefined && { calories: body.calories }),
      },
    });

    return NextResponse.json({ recipe: updated });
  } catch (error) {
    console.error('Update recipe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
