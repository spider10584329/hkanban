import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Generate a random API key in the format: xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
function generateApiKey(): string {
  const chars = 'abcdef0123456789';
  const segments: string[] = [];
  for (let i = 0; i < 8; i++) {
    const segment = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    segments.push(segment);
  }
  return segments.join('-');
}

interface ApiKeyRow {
  id: number;
  manager_id: number;
  api_key: string;
  created_at: string;
}

// GET - Fetch API key by manager_id (returns existing key or creates new one)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');

    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const managerIdInt = parseInt(managerId);

    // Check if API key already exists for this manager using raw query
    const existingKeys = await prisma.$queryRaw<ApiKeyRow[]>`
      SELECT * FROM apikey WHERE manager_id = ${managerIdInt} LIMIT 1
    `;

    let apiKeyValue: string;
    let createdAt: string;

    if (existingKeys.length > 0) {
      apiKeyValue = existingKeys[0].api_key;
      createdAt = existingKeys[0].created_at;
    } else {
      // Create new key
      const newKey = generateApiKey();
      const now = new Date().toISOString();

      await prisma.$executeRaw`
        INSERT INTO apikey (manager_id, api_key, created_at) VALUES (${managerIdInt}, ${newKey}, ${now})
      `;

      apiKeyValue = newKey;
      createdAt = now;
    }

    return NextResponse.json({
      apiKey: apiKeyValue,
      createdAt: createdAt,
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 }
    );
  }
}

// POST - Generate a new API key (replaces existing)
export async function POST(request: NextRequest) {
  try {
    const { manager_id } = await request.json();

    if (!manager_id) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    const managerIdInt = parseInt(manager_id);
    const newKey = generateApiKey();
    const now = new Date().toISOString();

    // Delete existing key if any
    await prisma.$executeRaw`
      DELETE FROM apikey WHERE manager_id = ${managerIdInt}
    `;

    // Create new key
    await prisma.$executeRaw`
      INSERT INTO apikey (manager_id, api_key, created_at) VALUES (${managerIdInt}, ${newKey}, ${now})
    `;

    return NextResponse.json({
      apiKey: newKey,
      createdAt: now,
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    return NextResponse.json(
      { error: 'Failed to generate API key' },
      { status: 500 }
    );
  }
}
