/**
 * SSE Endpoint for Real-time Sync Events
 * 
 * GET /api/sync/events - Connect to SSE stream for sync notifications
 * 
 * Clients connect to this endpoint to receive real-time notifications
 * when spools are created, updated, or deleted on the server.
 */

import { NextRequest } from 'next/server';
import { registerClient, unregisterClient, startHeartbeat } from '@/lib/sync/events';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    // Generate a unique client ID
    const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start heartbeat if not already running
    startHeartbeat();

    // Create the SSE stream
    const stream = new ReadableStream({
        start(controller) {
            // Register this client
            registerClient(clientId, controller);

            // Send initial connection confirmation
            const encoder = new TextEncoder();
            const connected = encoder.encode(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);
            controller.enqueue(connected);
        },
        cancel() {
            // Client disconnected
            unregisterClient(clientId);
        }
    });

    // Return SSE response
    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable nginx buffering
            'Access-Control-Allow-Origin': '*',
        }
    });
}
