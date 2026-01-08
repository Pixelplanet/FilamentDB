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
fi

# Ensure data directory exists with proper permissions
mkdir -p /app/data
chown -R nextjs:nodejs /app/data

# Set permissions to be world-writable (needed for Unraid with UMASK issues)
# This ensures existing files/dirs are accessible
chmod -R 777 /app/data

# Set UMASK (default 0000 = rwxrwxrwx for dirs, rw-rw-rw- for files)
# This ensures NEW files created by Node.js have correct permissions
umask "${UMASK}"

# Switch to nextjs user and execute the command
exec su-exec nextjs "$@"
