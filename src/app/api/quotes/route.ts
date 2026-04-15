import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/quotes?category=motivational&language=en&random=true&limit=1
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'motivational';
    const language = searchParams.get('language') || 'en';
    const random = searchParams.get('random') === 'true';
    const limit = parseInt(searchParams.get('limit') || '0');
    const activeOnly = searchParams.get('active') !== 'false';

    const where = {
      category,
      language,
      ...(activeOnly ? { active: true } : {}),
    };

    if (random) {
      // Get count for random offset
      const count = await prisma.motivationalQuote.count({ where });
      if (count === 0) {
        return NextResponse.json({ quotes: [], count: 0 });
      }

      const take = limit > 0 ? Math.min(limit, count) : 1;
      const skip = Math.max(0, Math.floor(Math.random() * count));

      const quotes = await prisma.motivationalQuote.findMany({
        where,
        take,
        skip,
        orderBy: { createdAt: 'asc' },
      });

      return NextResponse.json({ quotes, count });
    }

    const quotes = await prisma.motivationalQuote.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      ...(limit > 0 ? { take: limit } : {}),
    });

    return NextResponse.json({ quotes, count: quotes.length });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}

// POST /api/quotes - Create a new quote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, author, category, language } = body;

    if (!text || !category || !language) {
      return NextResponse.json(
        { error: 'text, category, and language are required' },
        { status: 400 }
      );
    }

    const quote = await prisma.motivationalQuote.create({
      data: { text, author: author || null, category, language, active: true },
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    console.error('Error creating quote:', error);
    return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
  }
}

// PUT /api/quotes - Update a quote
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, text, author, category, language, active } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const quote = await prisma.motivationalQuote.update({
      where: { id },
      data: {
        ...(text !== undefined ? { text } : {}),
        ...(author !== undefined ? { author } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(language !== undefined ? { language } : {}),
        ...(active !== undefined ? { active } : {}),
      },
    });

    return NextResponse.json({ quote });
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

// DELETE /api/quotes?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.motivationalQuote.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}
