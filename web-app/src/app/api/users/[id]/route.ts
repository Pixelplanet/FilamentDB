
import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/auth/UserService';
import { getUserFromRequest } from '@/lib/auth/serverUtils';

const ENABLED = process.env.ENABLE_USER_MANAGEMENT === 'true';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!ENABLED) return NextResponse.json({ error: 'Disabled' }, { status: 404 });

    try {
        const currentUser = await getUserFromRequest(req);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();

        // Prevent admin from demoting themselves if they are the only admin?
        // For simplicity, just allow it but warn in UI. 
        // Actually, preventing lockout is smart.
        if (body.role && body.role !== 'admin' && id === currentUser.id) {
            // Check if there are other admins
            const users = await UserService.getAllUsers();
            const adminCount = users.filter(u => u.role === 'admin').length;
            if (adminCount <= 1) {
                return NextResponse.json({ error: 'Cannot remove the last admin' }, { status: 400 });
            }
        }

        const updated = await UserService.updateUser(id, body);
        const { passwordHash, ...safeUser } = updated;

        return NextResponse.json(safeUser);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!ENABLED) return NextResponse.json({ error: 'Disabled' }, { status: 404 });

    try {
        const currentUser = await getUserFromRequest(req);
        if (!currentUser || currentUser.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const { id } = await params;
        if (id === currentUser.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        await UserService.deleteUser(id);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
