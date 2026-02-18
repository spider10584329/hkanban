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

    const devices = await prisma.device.findMany({
      where: {
        manager_id: parseInt(managerId),
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Calculate stats
    const totalDevices = devices.length;
    const activeDevices = devices.filter(d => d.status === 'active').length;
    const inactiveDevices = totalDevices - activeDevices;

    // Map devices to the format expected by the Products page dropdown
    const mappedDevices = devices.map(device => ({
      id: device.id,
      deviceId: device.mac_address,  // MAC address is used as deviceId for ESL tags
      deviceName: null,  // Can be enhanced later to store device names
      location: null,    // Can be enhanced later to store locations
      isOnline: device.status === 'active' ? 1 : 0,
    }));

    return NextResponse.json({
      devices: mappedDevices,
      stats: {
        totalDevices,
        activeDevices,
        inactiveDevices,
        onlineDevices: activeDevices,
        offlineDevices: inactiveDevices,
        lowBatteryDevices: 0,
        activeToday: 0,
      },
      locations: [],
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
    const { manager_id, mac_address, status = 'active' } = await request.json();

    if (!manager_id || !mac_address) {
      return NextResponse.json(
        { error: 'manager_id and mac_address are required' },
        { status: 400 }
      );
    }

    // Normalize MAC address
    const normalizedMac = mac_address.replace(/[:-]/g, '').toLowerCase();

    // Check if device already exists for this manager
    const existingDevice = await prisma.device.findFirst({
      where: {
        manager_id: parseInt(manager_id),
        mac_address: normalizedMac,
      },
    });

    if (existingDevice) {
      return NextResponse.json(
        { error: 'A device with this MAC address already exists' },
        { status: 409 }
      );
    }

    const device = await prisma.device.create({
      data: {
        manager_id: parseInt(manager_id),
        mac_address: normalizedMac,
        status: status,
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
    const { id, status } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Device id is required' },
        { status: 400 }
      );
    }

    const updatedDevice = await prisma.device.update({
      where: { id: parseInt(id) },
      data: {
        status: status || 'active',
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

    await prisma.device.delete({
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
