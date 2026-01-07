# User Management Implementation Plan

## 1. Overview
This feature introduces multi-user support to FilamentDB. It is designed to be **optional**. Server administrators can toggle it on or off. When enabled, it provides granular access control to spools, allowing users to keep their inventory private or share it with the server community.

## 2. Configuration
New environment variables:
- `ENABLE_USER_MANAGEMENT=true|false` (Default: `false`)
- `AUTH_SECRET=...` (Required for signing JWTs)
- `GOOGLE_CLIENT_ID=...` (Optional: For Google Login)
- `GOOGLE_CLIENT_SECRET=...` (Optional: For Google Login)

## 3. Data Model Changes

### 3.1. User Storage
We will stick to the **File-Based Architecture** using `data/users.json`.
```typescript
interface UserDatabase {
    users: User[];
    settings: {
        allowRegistration: boolean; 
    }
}

interface User {
    id: string;          // UUID
    username: string;    // Unique (email if Google)
    passwordHash?: string; // bcrypt hash (optional if Google-only)
    authProvider: 'local' | 'google';
    role: 'admin' | 'user';
    createdAt: number;
    displayName?: string;
    avatarUrl?: string;
}
```

### 3.2. Spool Metadata
```typescript
interface Spool {
    // ... existing fields ...
    ownerId?: string;           // ID of owner
    visibility?: 'private' | 'public'; // Default: 'private'
}
```

## 4. Authentication & Security

### 4.1. Security Best Practices
- **Passwords**: Hashed using **`bcryptjs`** (salt rounds: 10+). never stored in plain text.
- **Tokens**: Stateless JWTs signed with `HS256` using **`jose`** library (Edge compatible).
- **Transport**: HTTPS recommended for production.

### 4.2. Setup & Migration Flow
When `ENABLE_USER_MANAGEMENT=true` and `data/users.json` is empty:
1.  **Admin Creation**: The web UI redirects to `/setup`.
2.  **Account**: User creates the Admin account (Local or Google).
3.  **Migration Prompt**: "We found existing spools. What should we do?"
    - [ ] **Assign to Me**: Existing spools become Private owned by Admin.
    - [ ] **Make Public**: Existing spools become Public (owned by Admin, but visible to all).
    - [ ] **Delete**: Start fresh (Danger zone).

### 4.3. Google OAuth
- Users can choose "Sign in with Google".
- Backend verifies the ID Token with Google.
- If email matches existing account -> Login.
- If new -> Register (if allowed).

## 5. Access Control Rules

### 5.1. Roles
- **Admin**:
    - Can Manage Users (Promote/Demote/Ban).
    - Can Edit/Delete ANY spool.
    - Can change Server Settings.
- **User**:
    - Can Manage Own Profile.
    - Can Create/Edit/Delete Own Spools.
    - Can View Public Spools.

### 5.2. Spool Visibility
- **Private (Default)**: Visible ONLY to `ownerId`.
- **Public**: Visible to authenticated users. (Guest access configurable?).

## 6. Implementation Steps

### Phase 1: Foundation (Backend)
- [ ] Install `bcryptjs` and `jose`.
- [ ] Create `UserService` to handle `data/users.json`.
- [ ] Implement `POST /api/auth/register` & `/login`.
- [ ] Implement Google OTP Verification.
- [ ] Create Auth Middleware for Next.js.

### Phase 2: Frontend & setup
- [ ] Create Login/Register Pages.
- [ ] Create First-Run Setup Wizard (Migration logic).
- [ ] Update `useAuth` hook to manage session.

### Phase 3: Spool Integration
- [ ] Update `POST /api/spools` to attach owner.
- [ ] Update `GET /api/spools` to filter by visibility.
- [ ] Add "Visibility" toggle to Spool Form.

### Phase 4: Admin Tools
- [ ] Create `/admin/users` page.
- [ ] Implement "Promote to Admin" functionality.

### Phase 5: Mobile Update
- [ ] Update Android Sync Logic to support JWT Auth.

## 7. Dependencies
- `bcryptjs` (Password hashing)
- `jose` (JWT handling)
- `google-auth-library` (Google token verification)


