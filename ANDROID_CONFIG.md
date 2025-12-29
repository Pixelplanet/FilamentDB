# Android App Configuration

## Setting Up the API URL

When building the Android APK, the app needs to know where your FilamentDB server is deployed so it can make API calls for features like QR code scanning and URL scraping.

### Steps:

1. **Copy the example environment file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and set your server URL:**

   **For local development (testing on your local network):**
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.100:3000
   ```
   Replace `192.168.1.100` with your computer's local IP address.

   **For production (deployed server):**
   ```env
   NEXT_PUBLIC_API_URL=https://your-filamentdb-server.com
   ```
   Replace with your actual deployment URL.

3. **Build the app:**
   ```bash
   npm run build:mobile
   npm run cap:sync
   npx cap open android
   ```

### How It Works

- **Web App**: Uses relative URLs (e.g., `/api/scrape`) because it's served from the same origin
- **Android App**: Uses the absolute URL from `NEXT_PUBLIC_API_URL` (e.g., `https://your-server.com/ api/scrape`)

The `getApiUrl()` function in `src/lib/apiConfig.ts` automatically detects the platform and returns the correct URL.

### Testing Locally

If you want to test the Android app with your local development server:

1. Find your computer's local IP address:
   - **Windows**: `ipconfig` (look for IPv4 Address)
   - **Mac/Linux**: `ifconfig` or `ip addr`

2. Make sure your phone and computer are on the same WiFi network

3. Set `NEXT_PUBLIC_API_URL=http://YOUR_IP:3000` in `.env.local`

4. Start your dev server: `npm run dev`

5. Build and install the APK

### Troubleshooting

**Error: "unexpected token < <!DOCTYPE is not valid JSON"**
- This means the app is trying to fetch from a relative URL instead of your server
- Make sure `.env.local` exists and has the correct URL
- Rebuild the app completely: `npm run build:mobile && npm run cap:sync`

**Error: "Network request failed"**
- Check that your server is accessible from your phone
- Try opening the URL in your phone's browser first
- Check firewall settings on your computer
