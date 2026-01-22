import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Toggle device online/offline status (for testing)
export async function PATCH(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Device id is required' },
        { status: 400 }
      );
    }

    const device = await prisma.deviceStatus.findUnique({
      where: { id: parseInt(id) },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Toggle the online status
    const updatedDevice = await prisma.deviceStatus.update({
      where: { id: parseInt(id) },
      data: {
        isOnline: device.isOnline === 1 ? 0 : 1,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ device: updatedDevice });
  } catch (error) {
    console.error('Error toggling device status:', error);
    return NextResponse.json(
      { error: 'Failed to toggle device status' },
      { status: 500 }
    );
  }
}
