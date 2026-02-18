import { NextRequest, NextResponse } from 'next/server';
import { listTemplates, testMinewConnection } from '@/lib/minew';

/**
 * GET - List templates for a store
 * Query Parameters:
 * - storeId (required): Store ID
 * - page (optional): Current page number
 * - size (optional): Page size
 * - fuzzy (optional): Fuzzy search query
 * - color (optional): Filter by template color
 * - inch (optional): Filter by template size
 * - screening (optional): 0=all, 1=system templates, other=store templates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { error: 'storeId is required' },
        { status: 400 }
      );
    }

    // Test connection first to ensure we have a valid token
    const connectionStatus = await testMinewConnection();
    
    if (!connectionStatus.connected) {
      console.error('Minew connection failed:', connectionStatus.message);
      return NextResponse.json(
        { 
          error: 'Failed to connect to Minew cloud',
          details: connectionStatus.message,
          templates: [] // Return empty array to prevent frontend errors
        },
        { status: 503 }
      );
    }

    // Build options object from query parameters
    const options: {
      page?: number;
      size?: number;
      fuzzy?: string;
      color?: string;
      inch?: number;
      screening?: number;
    } = {};

    const page = searchParams.get('page');
    if (page) options.page = parseInt(page);

    const size = searchParams.get('size');
    if (size) options.size = parseInt(size);

    const fuzzy = searchParams.get('fuzzy');
    if (fuzzy) options.fuzzy = fuzzy;

    const color = searchParams.get('color');
    if (color) options.color = color;

    const inch = searchParams.get('inch');
    if (inch) options.inch = parseFloat(inch);

    const screening = searchParams.get('screening');
    if (screening) options.screening = parseInt(screening);

    const templates = await listTemplates(storeId, options);

    // Transform to match frontend expectations
    const transformedTemplates = templates.map(template => ({
      id: template.demoId,
      name: template.demoName,
      storeId: template.storeId,
      screenSize: `${template.screenSize.inch}" (${template.screenSize.width}x${template.screenSize.height})`,
      color: template.color,
      type: template.type,
      version: template.version,
      orientation: template.orientation
    }));

    return NextResponse.json({
      success: true,
      templates: transformedTemplates,
      count: transformedTemplates.length
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch templates', 
        details: error instanceof Error ? error.message : 'Unknown error',
        templates: [] // Return empty array to prevent frontend errors
      },
      { status: 500 }
    );
  }
}
