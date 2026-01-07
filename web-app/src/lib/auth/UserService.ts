
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { User, UserDatabase } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

const DEFAULT_DB: UserDatabase = {
    users: [],
    settings: {
        allowRegistration: true
    }
};

async function ensureDataDir() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

export class UserService {

    private static async loadDB(): Promise<UserDatabase> {
        await ensureDataDir();
        try {
            const data = await fs.readFile(USERS_FILE, 'utf-8');
            return JSON.parse(data);
        } catch {
            // If file doesn't exist or is corrupt, return default (and maybe save it?)
            // We won't auto-save here to avoid overwriting on corruption, but we return empty.
            return DEFAULT_DB;
        }
    }

    private static async saveDB(db: UserDatabase): Promise<void> {
        await ensureDataDir();
        await fs.writeFile(USERS_FILE, JSON.stringify(db, null, 2), 'utf-8');
    }

    /**
     * Initialize the user database if it doesn't exist
     */
    static async init(): Promise<void> {
        await ensureDataDir();
        try {
            await fs.access(USERS_FILE);
        } catch {
            await this.saveDB(DEFAULT_DB);
        }
    }

    static async getAllUsers(): Promise<User[]> {
        const db = await this.loadDB();
        return db.users;
    }

    static async findUserByUsername(username: string): Promise<User | undefined> {
        const db = await this.loadDB();
        return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    }

    static async findUserById(id: string): Promise<User | undefined> {
        const db = await this.loadDB();
        return db.users.find(u => u.id === id);
    }

    static async createUser(
        username: string,
        passwordPlain: string | undefined,
        authProvider: 'local' | 'google',
        displayName?: string
    ): Promise<User> {
        const db = await this.loadDB();

        // Check uniqueness
        if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
            throw new Error('Username already exists');
        }

        // Determine Role: First user is ALWAYS admin
        const role = db.users.length === 0 ? 'admin' : 'user';

        if (role === 'user' && !db.settings.allowRegistration) {
            // Admin is allowed to be created any time if database is empty?
            // Actually, if settings.allowRegistration is false, we should block ONLY if it's not the first user.
            throw new Error('Registration is disabled');
        }

        let passwordHash: string | undefined;
        if (passwordPlain) {
            passwordHash = await bcrypt.hash(passwordPlain, 10);
        }

        const newUser: User = {
            id: randomUUID(),
            username,
            passwordHash,
            authProvider,
            role,
            createdAt: Date.now(),
            displayName: displayName || username
        };

        db.users.push(newUser);
        await this.saveDB(db);

        return newUser;
    }

    static async verifyPassword(user: User, passwordPlain: string): Promise<boolean> {
        if (!user.passwordHash) return false;
        return bcrypt.compare(passwordPlain, user.passwordHash);
    }

    static async updateUser(id: string, updates: Partial<User>): Promise<User> {
        const db = await this.loadDB();
        const index = db.users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');

        const updatedUser = { ...db.users[index], ...updates };
        db.users[index] = updatedUser;
        await this.saveDB(db);
        return updatedUser;
    }

    static async deleteUser(id: string): Promise<void> {
        const db = await this.loadDB();
        const initialLength = db.users.length;
        db.users = db.users.filter(u => u.id !== id);

        if (db.users.length === initialLength) throw new Error('User not found');

        await this.saveDB(db);
    }

    static async hasUsers(): Promise<boolean> {
        const db = await this.loadDB();
        return db.users.length > 0;
    }
}
