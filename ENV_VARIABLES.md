# Environment Variables for Sync Feature

## Server-Side Configuration

Create a `.env` or `.env.local` file in the `web-app` directory with these variables:

```env
# API Key for sync authentication  
# ⚠️ CHANGE THIS IN PRODUCTION!
SYNC_API_KEY=dev-key-change-in-production

# Directory where sync data is stored
# Default: ./data
SYNC_DATA_DIR=/app/data
```

## Client-Side Configuration

Client configuration is done via the Settings page UI:
- **Server URL**: Enter your server's address (e.g., `http://192.168.1.100:3000`)
- **API Key**: Must match the `SYNC_API_KEY` set on the server

Configuration is stored in the browser's localStorage.

## Docker Deployment

When using Docker, pass these environment variables:

```bash
docker run -p 3000:3000 \
  -e SYNC_API_KEY=your-secure-key-here \
  -e SYNC_DATA_DIR=/app/data \
  -v ./data:/app/data \
  filamentdb
```

Or in `docker-compose.yml`:

```yaml
services:
  web-app:
    environment:
      - SYNC_API_KEY=your-secure-key-here
      - SYNC_DATA_DIR=/app/data
    volumes:
      - ./data:/app/data
```

## Security Notes

1. **Never commit your `.env` file** - It's already in `.gitignore`
2. **Use a strong API key** - Generate a random string
3. **Use HTTPS in production** - Prevents key interception
4. **Backup your data directory** - Contains all sync data
