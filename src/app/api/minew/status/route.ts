import { NextResponse } from 'next/server';
import { testMinewConnection } from '@/lib/minew';

export async function GET() {
  try {
    const connectionStatus = await testMinewConnection();
    
    return NextResponse.json({
      success: true,
      minew: connectionStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        minew: {
          connected: false,
          message: `Error testing connection: ${errorMessage}`,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
