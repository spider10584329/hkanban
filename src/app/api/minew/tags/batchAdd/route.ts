import { NextRequest, NextResponse } from 'next/server';
import { importESLTags, testMinewConnection } from '@/lib/minew';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Test Minew connection first to ensure valid token
    const connectionTest = await testMinewConnection();
    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          error: 'Failed to connect to Minew API',
          details: connectionTest.message
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { storeId, macArray, type = 1, manager_id } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store ID is required' },
        { status: 400 }
      );
    }

    if (!manager_id) {
      return NextResponse.json(
        { error: 'Administrator ID (manager_id) is required' },
        { status: 400 }
      );
    }

    if (!macArray || !Array.isArray(macArray) || macArray.length === 0) {
      return NextResponse.json(
        { error: 'MAC address array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate MAC address format
    const invalidMacs = macArray.filter(mac => {
      const cleanMac = mac.replace(/[:-]/g, '');
      return !/^[0-9A-Fa-f]{12}$/.test(cleanMac);
    });

    if (invalidMacs.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid MAC address format',
          details: `Invalid MAC addresses: ${invalidMacs.join(', ')}`
        },
        { status: 400 }
      );
    }

    // Call Minew API to register devices
    console.log('[batchAdd] Calling Minew API with:', { storeId, macArray });
    const result = await importESLTags(storeId, macArray);
    console.log('[batchAdd] Minew API result:', {
      success: result.success,
      code: result.code,
      hasResults: !!result.results,
      resultsCount: result.results ? Object.keys(result.results).length : 0
    });

    // Track local database registration results
    const localDbResults: Record<string, { success: boolean; error?: string }> = {};

    // Helper function to find MAC status from results (handles different MAC formats)
    const findMacStatus = (results: Record<string, string>, targetMac: string): string | undefined => {
      const normalizedTarget = targetMac.replace(/[:-]/g, '').toLowerCase();
      for (const [key, value] of Object.entries(results)) {
        const normalizedKey = key.replace(/[:-]/g, '').toLowerCase();
        if (normalizedKey === normalizedTarget) {
          return String(value);
        }
      }
      return undefined;
    };

    // Helper function to register device in local database
    const registerDeviceInLocalDb = async (cleanMac: string): Promise<{ success: boolean; error?: string }> => {
      try {
        console.log(`[DB] Registering device in local DB: ${cleanMac} for manager_id: ${manager_id}`);

        // Check if device already exists in local database
        const existingDevice = await prisma.device.findFirst({
          where: {
            manager_id: Number(manager_id),
            mac_address: cleanMac,
          },
        });

        if (existingDevice) {
          console.log(`[DB] Device ${cleanMac} exists, updating status to active`);
          // Update existing device status
          await prisma.device.update({
            where: { id: existingDevice.id },
            data: {
              status: 'active',
            },
          });
        } else {
          console.log(`[DB] Device ${cleanMac} doesn't exist, creating new`);
          // Create new device
          await prisma.device.create({
            data: {
              manager_id: Number(manager_id),
              mac_address: cleanMac,
              status: 'active',
            },
          });
        }

        console.log(`[DB] Successfully registered ${cleanMac} in local database`);
        return { success: true };
      } catch (dbError) {
        console.error(`[DB] Failed to register ${cleanMac}:`, dbError);
        return {
          success: false,
          error: dbError instanceof Error ? dbError.message : 'Database error',
        };
      }
    };

    // Register in local database based on Minew API results
    console.log('[batchAdd] Starting local DB registration logic');

    // Case 1: result.results exists - check each MAC status
    if (result.results) {
      console.log('[batchAdd] Case 1: result.results exists, checking each MAC');
      for (const mac of macArray) {
        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        const minewStatus = findMacStatus(result.results, cleanMac);
        console.log(`[batchAdd] MAC ${cleanMac}: Minew status = "${minewStatus}"`);

        // Determine if we should register in local DB:
        // - "0" = newly registered successfully
        // - "success" = registration successful
        // - Contains "already"/"exist"/"registered" = device exists in Minew (still usable)
        // - undefined but result.code === 200 = assume success
        const statusStr = minewStatus || '';
        const isNewlyRegistered = statusStr === '0' || statusStr.toLowerCase() === 'success';
        const isAlreadyInMinew = statusStr.toLowerCase().includes('already') ||
                                  statusStr.toLowerCase().includes('exist') ||
                                  statusStr.toLowerCase().includes('registered');
        const shouldRegister = isNewlyRegistered || isAlreadyInMinew || (result.code === 200 && !statusStr);

        console.log(`[batchAdd] MAC ${cleanMac}: shouldRegister = ${shouldRegister} (newly: ${isNewlyRegistered}, already: ${isAlreadyInMinew})`);

        if (shouldRegister) {
          localDbResults[cleanMac] = await registerDeviceInLocalDb(cleanMac);
        } else {
          console.log(`[batchAdd] MAC ${cleanMac}: Skipping local DB registration - Minew failed`);
          localDbResults[cleanMac] = {
            success: false,
            error: `Minew registration failed: ${minewStatus || 'Unknown error'}`,
          };
        }
      }
    }
    // Case 2: No results but API returned success (code 200)
    else if (result.code === 200 || result.success) {
      console.log('[batchAdd] Case 2: No results but success, registering all MACs');
      for (const mac of macArray) {
        const cleanMac = mac.replace(/[:-]/g, '').toLowerCase();
        localDbResults[cleanMac] = await registerDeviceInLocalDb(cleanMac);
      }
    } else {
      console.log('[batchAdd] No case matched - not registering in local DB');
      console.log('[batchAdd] result.code:', result.code, 'result.success:', result.success);
    }

    // Count successful local registrations
    const localSuccessCount = Object.values(localDbResults).filter(r => r.success).length;
    const localFailCount = Object.values(localDbResults).filter(r => !r.success).length;

    console.log('[batchAdd] Summary:');
    console.log(`  - Total MACs: ${macArray.length}`);
    console.log(`  - Local DB successes: ${localSuccessCount}`);
    console.log(`  - Local DB failures: ${localFailCount}`);
    console.log('[batchAdd] Local DB results:', localDbResults);

    // If any local DB registration succeeded, consider it a success
    // (device may already exist in Minew but we still want it in local DB)
    if (localSuccessCount > 0) {
      return NextResponse.json({
        success: true,
        code: 200,
        message: `Successfully registered ${localSuccessCount} ESL label(s)`,
        data: {
          minew: result.results,
          localDatabase: localDbResults,
        },
      });
    }

    // If no local DB registrations succeeded, check why
    if (!result.success) {
      // Handle specific error codes from Minew API
      const errorCode = result.code;
      let errorMessage = result.error || 'Failed to add ESL label';
      let statusCode = 400;

      // Only override the error message for specific API-level error codes (not 200)
      if (errorCode !== 200) {
        switch (errorCode) {
          case 10059:
            errorMessage = 'No permission to add devices to this store';
            statusCode = 403;
            break;
          case 12067:
            errorMessage = 'The store ID does not exist';
            statusCode = 404;
            break;
          case 12099:
            errorMessage = 'Device already registered or invalid MAC address. Please check if the device is already in the system.';
            statusCode = 409;
            break;
          default:
            errorMessage = result.message || result.error || 'Failed to add ESL label';
        }
      } else {
        // If code is 200, use the actual error message from the data results
        errorMessage = result.error || result.message || 'Failed to add ESL label';
        statusCode = 400;
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          code: errorCode,
          details: result.message,
        },
        { status: statusCode }
      );
    }

    // Fallback: return success if Minew succeeded but no local registrations
    return NextResponse.json({
      success: true,
      code: 200,
      message: `Successfully added ${macArray.length} ESL label(s) to Minew`,
      data: {
        minew: result.results,
        localDatabase: localDbResults,
      },
    });

  } catch (error) {
    console.error('Error adding ESL label:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
