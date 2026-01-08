# Unraid Configuration Persistence Fix

## Problem
The `ENABLE_USER_MANAGEMENT` setting resets to `false` after container restarts, even after clicking "Apply" in the Unraid UI.

## Root Cause
Unraid's Docker template system can have issues with environment variables that:
1. Have a `Default=""` attribute
2. Are not explicitly set by the user
3. Have content between XML tags that conflicts with the Default attribute

## Solution

### Option 1: Update Template (Recommended)
1. Stop the FilamentDB container
2. Remove the container (don't worry, your data is safe in `/mnt/user/appdata/filamentdb`)
3. In Unraid Docker tab, click "Add Container"
4. Select "FilamentDB" from your templates
5. **Explicitly type `true`** in the "Enable User Management" field
6. Click "Apply"
7. The container will recreate with the setting saved

### Option 2: Manual Template Edit
If Option 1 doesn't work:

1. SSH into your Unraid server
2. Edit your user template:
   ```bash
   nano /boot/config/plugins/dockerMan/templates-user/my-FilamentDB.xml
   ```
3. Find the line with `ENABLE_USER_MANAGEMENT`
4. Change it to:
   ```xml
   <Config Name="Enable User Management" Target="ENABLE_USER_MANAGEMENT" Default="true" Mode="" ... >true</Config>
   ```
5. Save and exit (Ctrl+X, Y, Enter)
6. Restart the container

### Option 3: Docker Compose (Alternative)
If Unraid template persistence continues to fail, use docker-compose:

1. SSH into Unraid
2. Navigate to your appdata:
   ```bash
   cd /mnt/user/appdata/filamentdb
   ```
3. Create `docker-compose.yml`:
   ```yaml
   version: '3.8'
   services:
     filamentdb:
       image: pixelplanet5/filamentdb-app:latest
       container_name: filamentdb
       ports:
         - "3000:3000"
       volumes:
         - ./data:/app/data
       environment:
         - ENABLE_USER_MANAGEMENT=true
         - AUTH_SECRET=your-secret-key-here
         - SYNC_API_KEY=your-api-key-here
         - PUID=99
         - PGID=100
         - UMASK=0000
       restart: unless-stopped
   ```
4. Run:
   ```bash
   docker-compose up -d
   ```

## Verification

After applying any solution:

1. Check the container logs:
   ```bash
   docker logs filamentdb | head -20
   ```
2. Look for: `ENABLE_USER_MANAGEMENT=true`
3. Navigate to `http://YOUR_SERVER_IP:3000/register`
4. Should show registration page (not redirect)

## Why This Happens

Unraid stores template configurations in two places:
- **Template Repository**: `/boot/config/plugins/dockerMan/templates/`
- **User Overrides**: `/boot/config/plugins/dockerMan/templates-user/`

If the user override doesn't explicitly set the value, Unraid falls back to the Default attribute from the original template. The fix ensures the value is properly stored in the user override.

## Updated Template (v0.2.8)

The latest template fixes this by:
1. Using self-closing tag format (no content between tags)
2. Clearer description emphasizing the need to type the value
3. Proper Default attribute handling

Update your template by:
1. Removing the FilamentDB template
2. Re-adding from: https://raw.githubusercontent.com/Pixelplanet/FilamentDB/main/web-app/FilamentDB.xml
