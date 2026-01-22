import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch devices by manager_id
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

    const devices = await prisma.deviceStatus.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate stats
    const totalDevices = devices.length;
    const onlineDevices = devices.filter(d => d.isOnline === 1).length;
    const offlineDevices = totalDevices - onlineDevices;
    const lowBatteryDevices = devices.filter(d => d.batteryLevel !== null && d.batteryLevel < 20).length;
    
    // Active today (devices that synced in the last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const activeToday = devices.filter(d => 
      d.lastSyncAt && new Date(d.lastSyncAt) > yesterday
    ).length;

    // Get unique locations
    const locations = [...new Set(devices.map(d => d.location).filter(Boolean))];

    return NextResponse.json({
      devices,
      stats: {
        totalDevices,
        onlineDevices,
        offlineDevices,
        lowBatteryDevices,
        activeToday,
      },
      locations,
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

// POST - Register a new device
export async function POST(request: NextRequest) {
  try {
    const {
      manager_id,
      deviceId,
      deviceType,
      deviceName,
      location,
      firmwareVersion,
    } = await request.json();

    if (!manager_id || !deviceId || !deviceType) {
      return NextResponse.json(
        { error: 'manager_id, deviceId, and deviceType are required' },
        { status: 400 }
      );
    }

    // Check if device already exists for this manager
    const existingDevice = await prisma.deviceStatus.findFirst({
      where: {
        manager_id: parseInt(manager_id),
        deviceId: deviceId.trim(),
      },
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: 'A device with this ID already exists' },
        { status: 409 }
      );
    }

    const device = await prisma.deviceStatus.create({
      data: {
        manager_id: parseInt(manager_id),
        deviceId: deviceId.trim(),
        deviceType: deviceType.trim(),
        deviceName: deviceName?.trim() || null,
        location: location?.trim() || null,
        firmwareVersion: firmwareVersion?.trim() || null,
        isOnline: 0,
        installationDate: new Date(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ device });
  } catch (error) {
    console.error('Error creating device:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}

// PUT - Update a device
export async function PUT(request: NextRequest) {
  try {
    const {
      id,
      deviceName,
      location,
      deviceType,
      firmwareVersion,
    } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Device id is required' },
        { status: 400 }
      );
    }

    const updatedDevice = await prisma.deviceStatus.update({
      where: { id: parseInt(id) },
      data: {
        deviceName: deviceName?.trim() || null,
        location: location?.trim() || null,
        deviceType: deviceType?.trim() || null,
        firmwareVersion: firmwareVersion?.trim() || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ device: updatedDevice });
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json(
      { error: 'Failed to update device' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a device
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('id');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device id is required' },
        { status: 400 }
      );
    }

    // Check if device is assigned to any product
    const product = await prisma.product.findFirst({
      where: {
        einkDeviceId: (await prisma.deviceStatus.findUnique({
          where: { id: parseInt(deviceId) },
        }))?.deviceId,
      },
    });

    if (product) {
      return NextResponse.json(
        { error: 'Cannot delete device assigned to a product. Please unassign it first.' },
        { status: 400 }
      );
    }

    await prisma.deviceStatus.delete({
      where: { id: parseInt(deviceId) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting device:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}
