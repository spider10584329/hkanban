import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ApiKeyRow {
  id: number;
  manager_id: number;
  api_key: string;
  created_at: string;
}

interface RequestRow {
  id: number;
  manager_id: number;
  productId: number;
  requestedById: number;
  requestMethod: string;
  deviceInfo: string | null;
  requestedQty: number | null;
  location: string;
  notes: string | null;
  status: string;
  priority: string;
  approvedById: number | null;
  approvedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  // Product fields
  product_name: string;
  product_sku: string | null;
  product_location: string;
  product_standardOrderQty: number | null;
  product_qrCodeUrl: string | null;
  product_einkDeviceId: string | null;
  // Category field
  category_name: string | null;
  // User fields
  requestedBy_username: string | null;
  approvedBy_username: string | null;
}

// GET - Fetch unfinished replenishment requests (requires API key validation)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const managerId = searchParams.get('manager_id');
    const apiKey = searchParams.get('apikey');
    const format = searchParams.get('format') || 'json';

    // Validate required parameters
    if (!managerId) {
      return NextResponse.json(
        { error: 'manager_id is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'apikey is required' },
        { status: 400 }
      );
    }

    const managerIdInt = parseInt(managerId);

    // Validate API key
    const validKeys = await prisma.$queryRaw<ApiKeyRow[]>`
      SELECT * FROM apikey WHERE manager_id = ${managerIdInt} AND api_key = ${apiKey} LIMIT 1
    `;

    if (validKeys.length === 0) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Fetch unfinished requests using raw SQL with JOINs
    const requests = await prisma.$queryRaw<RequestRow[]>`
      SELECT
        r.id,
        r.manager_id,
        r.productId,
        r.requestedById,
        r.requestMethod,
        r.deviceInfo,
        r.requestedQty,
        r.location,
        r.notes,
        r.status,
        r.priority,
        r.approvedById,
        r.approvedAt,
        r.rejectionReason,
        r.createdAt,
        r.updatedAt,
        r.completedAt,
        p.name AS product_name,
        p.sku AS product_sku,
        p.location AS product_location,
        p.standardOrderQty AS product_standardOrderQty,
        p.qrCodeUrl AS product_qrCodeUrl,
        p.einkDeviceId AS product_einkDeviceId,
        c.name AS category_name,
        u1.username AS requestedBy_username,
        u2.username AS approvedBy_username
      FROM replenishment_requests r
      LEFT JOIN products p ON r.productId = p.id
      LEFT JOIN categories c ON p.categoryId = c.id
      LEFT JOIN users u1 ON r.requestedById = u1.id
      LEFT JOIN users u2 ON r.approvedById = u2.id
      WHERE r.manager_id = ${managerIdInt}
        AND r.status IN ('PENDING', 'APPROVED', 'ORDERED')
      ORDER BY
        CASE r.priority
          WHEN 'URGENT' THEN 1
          WHEN 'HIGH' THEN 2
          ELSE 3
        END,
        r.createdAt DESC
    `;

    // Format the response data
    const formattedRequests = requests.map((req) => ({
      id: req.id,
      itemName: req.product_name,
      sku: req.product_sku || '',
      category: req.category_name || '',
      location: req.location,
      status: req.status,
      priority: req.priority,
      requestedQty: req.requestedQty || req.product_standardOrderQty || 0,
      requestMethod: req.requestMethod,
      requestedBy: req.requestedBy_username || '',
      approvedBy: req.approvedBy_username || '',
      notes: req.notes || '',
      qrCodeUrl: req.product_qrCodeUrl || '',
      eslMacAddress: req.product_einkDeviceId || '',
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }));

    // Return CSV format if requested
    if (format === 'csv') {
      const csvHeaders = 'Item Name,SKU,Category,Location,Status,Priority,Requested Qty,Request Method,Requested By,Approved By,Notes,QR Code URL,ESL MAC Address,Created At';
      const csvRows = formattedRequests.map((req) =>
        `"${req.itemName}","${req.sku}","${req.category}","${req.location}","${req.status}","${req.priority}","${req.requestedQty}","${req.requestMethod}","${req.requestedBy}","${req.approvedBy}","${(req.notes || '').replace(/"/g, '""')}","${req.qrCodeUrl}","${req.eslMacAddress}","${req.createdAt}"`
      );
      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="replenishment_requests.csv"',
        },
      });
    }

    // Return JSON format (default)
    return NextResponse.json({
      success: true,
      manager_id: managerIdInt,
      total: formattedRequests.length,
      requests: formattedRequests,
    });
  } catch (error) {
    console.error('Error fetching requests via API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
