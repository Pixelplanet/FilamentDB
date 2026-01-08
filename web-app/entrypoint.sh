#!/bin/sh
set -e

echo "========================================="
echo "FilamentDB Container Starting"
echo "PUID=${PUID}, PGID=${PGID}, UMASK=${UMASK}"
echo "========================================="

# This script MUST run as root initially to modify users/groups
if [ "$(id -u)" != "0" ]; then
    echo "ERROR: Entrypoint must run as root!"
    exit 1
fi

# Change nextjs user/group IDs to match PUID/PGID
echo "Modifying nextjs user to UID=${PUID}, GID=${PGID}..."
groupmod -o -g "${PGID}" nodejs 2>/dev/null || echo "Group modification skipped"
usermod -o -u "${PUID}" nextjs 2>/dev/null || echo "User modification skipped"

# Ensure data directory exists
echo "Creating /app/data directory..."
mkdir -p /app/data

# Set ownership to the modified nextjs user
echo "Setting ownership: chown -R ${PUID}:${PGID} /app/data"
chown -R "${PUID}:${PGID}" /app/data

# Set world-writable permissions (Unraid compatibility)
echo "Setting permissions: chmod -R 777 /app/data"
chmod -R 777 /app/data

# Set UMASK for new file creation
echo "Setting UMASK to ${UMASK}"
umask "${UMASK}"

# Verify we're about to switch users
echo "Current user: $(id)"
echo "Switching to user: $(id nextjs)"

# Switch to nextjs user and execute the command
echo "Executing: $@"
echo "========================================="
exec su-exec nextjs "$@"
