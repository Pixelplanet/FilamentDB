import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { MaterialProfile } from '@/db';


const PROFILES_FILE = path.join(process.cwd(), 'data', 'profiles.json');

// Helper to ensure data directory exists
async function ensureDataDir() {
    const dir = path.dirname(PROFILES_FILE);
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

// Defaults
const DEFAULT_PROFILES: MaterialProfile[] = [
    { id: 'pla', name: 'Polylactic Acid', type: 'PLA', density: 1.24, temperatureNozzleMin: 190, temperatureNozzleMax: 220, temperatureBedMin: 40, temperatureBedMax: 60 },
    { id: 'petg', name: 'Polyethylene Terephthalate Glycol', type: 'PETG', density: 1.27, temperatureNozzleMin: 230, temperatureNozzleMax: 250, temperatureBedMin: 70, temperatureBedMax: 90 },
    { id: 'abs', name: 'Acrylonitrile Butadiene Styrene', type: 'ABS', density: 1.04, temperatureNozzleMin: 230, temperatureNozzleMax: 260, temperatureBedMin: 90, temperatureBedMax: 110 },
    { id: 'asa', name: 'Acrylonitrile Styrene Acrylate', type: 'ASA', density: 1.07, temperatureNozzleMin: 240, temperatureNozzleMax: 260, temperatureBedMin: 90, temperatureBedMax: 110 },
    { id: 'tpu', name: 'Thermoplastic Polyurethane', type: 'TPU', density: 1.21, temperatureNozzleMin: 210, temperatureNozzleMax: 230, temperatureBedMin: 40, temperatureBedMax: 60 },
    { id: 'pc', name: 'Polycarbonate', type: 'PC', density: 1.20, temperatureNozzleMin: 260, temperatureNozzleMax: 280, temperatureBedMin: 100, temperatureBedMax: 120 },
    { id: 'pa', name: 'Polyamide (Nylon)', type: 'PA', density: 1.14, temperatureNozzleMin: 250, temperatureNozzleMax: 280, temperatureBedMin: 40, temperatureBedMax: 60 },
    { id: 'hips', name: 'High Impact Polystyrene', type: 'HIPS', density: 1.04, temperatureNozzleMin: 230, temperatureNozzleMax: 250, temperatureBedMin: 90, temperatureBedMax: 110 },
    { id: 'pvb', name: 'Polyvinyl Butyral', type: 'PVB', density: 1.08, temperatureNozzleMin: 190, temperatureNozzleMax: 220, temperatureBedMin: 40, temperatureBedMax: 60 },
    { id: 'pva', name: 'Polyvinyl Alcohol', type: 'PVA', density: 1.19, temperatureNozzleMin: 190, temperatureNozzleMax: 210, temperatureBedMin: 40, temperatureBedMax: 60 },
];

async function getProfiles(): Promise<MaterialProfile[]> {
    try {
        await ensureDataDir();
        const content = await fs.readFile(PROFILES_FILE, 'utf-8');
        const data = JSON.parse(content);
        if (!Array.isArray(data) || data.length === 0) throw new Error('Empty');
        return data;
    } catch {
        // If file missing or empty, seed defaults
        await ensureDataDir(); // Ensure again just in case
        await fs.writeFile(PROFILES_FILE, JSON.stringify(DEFAULT_PROFILES, null, 2));
        return DEFAULT_PROFILES;
    }
}

export async function GET() {
    return NextResponse.json(await getProfiles());
}

export async function POST(req: NextRequest) {
    try {
        await ensureDataDir();
        const profile: MaterialProfile = await req.json();

        if (!profile.id || !profile.name || !profile.type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const profiles = await getProfiles();
        const index = profiles.findIndex(p => p.id === profile.id);

        if (index >= 0) {
            profiles[index] = profile;
        } else {
            profiles.push(profile);
        }

        await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
        return NextResponse.json({ success: true, profile });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await ensureDataDir();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        let profiles = await getProfiles();
        profiles = profiles.filter(p => p.id !== id);

        await fs.writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2));
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
