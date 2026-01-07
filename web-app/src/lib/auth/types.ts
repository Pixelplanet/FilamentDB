
export interface User {
    id: string;
    username: string;          // Unique (email if Google)
    passwordHash?: string;     // bcrypt hash (optional if Google-only)
    authProvider: 'local' | 'google';
    role: 'admin' | 'user';
    createdAt: number;
    displayName?: string;
    avatarUrl?: string; // Optional URL to avatar image
}

export interface UserDatabase {
    users: User[];
    settings: {
        allowRegistration: boolean;
    };
}
