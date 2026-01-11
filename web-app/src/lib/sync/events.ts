/**
 * Server-Sent Events (SSE) for Real-time Sync
 * 
 * This module manages SSE connections and broadcasts sync events
 * to all connected clients when spools are created, updated, or deleted.
 */

// Types
export type SyncEventType = 'create' | 'update' | 'delete' | 'sync';

export interface SyncEvent {
    type: SyncEventType;
    serial?: string;
    timestamp: number;
}

// In-memory store of SSE clients
// Each client is represented by a controller that can write to their stream
interface SSEClient {
    id: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
    connectedAt: number;
}

const clients: Map<string, SSEClient> = new Map();

/**
 * Register a new SSE client
 */
export function registerClient(id: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    clients.set(id, {
        id,
        controller,
        connectedAt: Date.now()
    });
    console.log(`[SSE] Client connected: ${id} (total: ${clients.size})`);
}

/**
 * Unregister an SSE client
 */
export function unregisterClient(id: string): void {
    clients.delete(id);
    console.log(`[SSE] Client disconnected: ${id} (total: ${clients.size})`);
}

/**
 * Get the number of connected clients
 */
export function getClientCount(): number {
    return clients.size;
}

/**
 * Broadcast a sync event to all connected clients
 */
export function broadcastSyncEvent(type: SyncEventType, serial?: string): void {
    const event: SyncEvent = {
        type,
        serial,
        timestamp: Date.now()
    };

    const data = `data: ${JSON.stringify(event)}\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);

    let sentCount = 0;
    const deadClients: string[] = [];

    clients.forEach((client, id) => {
        try {
            client.controller.enqueue(encoded);
            sentCount++;
        } catch (error) {
            // Client connection is dead, mark for removal
            console.error(`[SSE] Error sending to client ${id}:`, error);
            deadClients.push(id);
        }
    });

    // Clean up dead clients
    deadClients.forEach(id => clients.delete(id));

    if (sentCount > 0) {
        console.log(`[SSE] Broadcast ${type} event to ${sentCount} clients`);
    }
}

/**
 * Send a heartbeat to all clients to keep connections alive
 */
export function sendHeartbeat(): void {
    const data = `: heartbeat\n\n`;
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);

    const deadClients: string[] = [];

    clients.forEach((client, id) => {
        try {
            client.controller.enqueue(encoded);
        } catch {
            deadClients.push(id);
        }
    });

    // Clean up dead clients
    deadClients.forEach(id => clients.delete(id));
}

// Start heartbeat interval (every 30 seconds)
let heartbeatInterval: NodeJS.Timeout | null = null;

export function startHeartbeat(): void {
    if (heartbeatInterval) return;

    heartbeatInterval = setInterval(() => {
        sendHeartbeat();
    }, 30000);

    console.log('[SSE] Heartbeat started');
}

export function stopHeartbeat(): void {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
        console.log('[SSE] Heartbeat stopped');
    }
}
