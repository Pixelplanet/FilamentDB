#!/bin/sh
set -e

# Unraid/Docker PUID/PGID/UMASK support
# This script adjusts the nextjs user to match the host's PUID/PGID
# and sets the UMASK for proper file permissions

echo "Starting FilamentDB with PUID=${PUID}, PGID=${PGID}, UMASK=${UMASK}"

# Change nextjs user/group IDs to match PUID/PGID
if [ "${PUID}" != "1001" ] || [ "${PGID}" != "1001" ]; then
    echo "Adjusting user permissions to PUID=${PUID}, PGID=${PGID}"
    
    # Change group ID
    groupmod -o -g "${PGID}" nodejs
    
    # Change user ID
    usermod -o -u "${PUID}" nextjs
    
    # Fix ownership of application files
    chown -R nextjs:nodejs /app
    chown -R nextjs:nodejs /app/data || true
fi

# Set UMASK (default 0022 = rwxr-xr-x for dirs, rw-r--r-- for files)
# For Unraid, you might want 0000 for full permissions
umask "${UMASK}"

# Switch to nextjs user and execute the command
exec su-exec nextjs "$@"
