FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Build Mode to Server so next.config.ts uses 'standalone'
ENV BUILD_MODE=server
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Uncomment the following line in case you want to disable telemetry during runtime.
# ENV NEXT_TELEMETRY_DISABLED=1

# Install shadow package for usermod/groupmod and su-exec (Unraid compatibility)
RUN apk add --no-cache shadow su-exec

# Create default user and group (will be modified by entrypoint if PUID/PGID are set)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /app/public/downloads
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Create data directory for JSON DB
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV ENABLE_USER_MANAGEMENT=false
ENV AUTH_SECRET="change-this-secret-in-production"

# Default PUID/PGID/UMASK for Unraid compatibility
ENV PUID=1001
ENV PGID=1001
ENV UMASK=0022

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]
