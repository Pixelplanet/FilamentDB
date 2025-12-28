# Docker Development Guide

> **For LLMs and Developers**: This guide ensures consistent Docker workflows and prevents creating duplicate containers/images.

## 🎯 Core Principles

1. **NEVER create new Docker Hub repositories** - Always use `pixelplanet5/filamentdb-app`
2. **NEVER build locally unless testing** - Use the Docker Hub image
3. **ALWAYS check existing containers** before creating new ones
4. **ALWAYS use docker-compose** for container management

---

## 📦 Docker Hub Repository

**Official Repository**: `pixelplanet5/filamentdb-app`  
**Tags**: `latest` (always use this)

### ⚠️ DO NOT:
- Create new repositories like `pixelplanet/filamentdb`, `filament-db`, etc.
- Use different tags without coordination
- Build and push without updating the existing image

---

## 🚀 Standard Workflows

### 1. **Starting the Application** (Most Common)

```bash
cd web-app
docker-compose up -d
```

This will:
- Pull `pixelplanet5/filamentdb-app:latest` from Docker Hub if not cached
- Start the container on port 3000
- Use existing volumes for data persistence

### 2. **Stopping the Application**

```bash
cd web-app
docker-compose down
```

**DO NOT** use `docker stop` or `docker rm` directly unless absolutely necessary.

### 3. **Restarting After Code Changes**

**If YOU made code changes:**

```bash
cd web-app
docker-compose down
docker-compose up -d --pull always
```

The `--pull always` ensures you get the latest image from Docker Hub.

**If USER made code changes and wants to test locally:**

```bash
cd web-app
docker-compose down

# Temporarily change docker-compose.yml to use build
# (but commit should still use image:)
docker-compose build
docker-compose up -d
```

---

## 🔧 Updating the Docker Hub Image

**Only do this when:**
- A new feature is complete and tested
- Bug fixes are ready to deploy
- The user explicitly asks to update Docker Hub

**Steps:**

```bash
# 1. Ensure container is stopped
cd web-app
docker-compose down

# 2. Build the new image
docker-compose build

# 3. Tag it properly (using the EXISTING repo name)
docker tag web-app-web-app:latest pixelplanet5/filamentdb-app:latest

# 4. Login to Docker Hub (if needed)
docker login

# 5. Push to Docker Hub
docker push pixelplanet5/filamentdb-app:latest

# 6. Clean up local tags
docker rmi web-app-web-app:latest

# 7. Restart using Docker Hub image
docker-compose up -d
```

---

## 🧹 Cleaning Up

### Check Current State

```bash
# List all containers
docker ps -a

# List all images
docker images

# Check what's using disk space
docker system df
```

### Remove Duplicate Tags

```bash
# Remove a specific tag (keeps the image if other tags exist)
docker rmi <image-name>:<tag>

# Example:
docker rmi web-app-web-app:latest
docker rmi pixelplanet/filamentdb:latest  # Wrong repo name
```

### Full Cleanup (Careful!)

```bash
# Stop all containers first
docker-compose down

# Remove unused images
docker image prune -a

# Remove unused volumes (THIS DELETES DATA!)
docker volume prune
```

---

## 📋 Pre-Flight Checklist

Before running Docker commands, check:

- [ ] Is there already a running container? (`docker ps`)
- [ ] Am I using the correct repository name? (`pixelplanet5/filamentdb-app`)
- [ ] Is `docker-compose.yml` configured to use `image:` not `build:`?
- [ ] Do I need to pull latest from Docker Hub? (`--pull always`)

---

## 🚨 Common Mistakes to Avoid

### ❌ Creating New Containers

**Wrong:**
```bash
docker run -p 3000:3000 pixelplanet5/filamentdb-app:latest
```

**Right:**
```bash
cd web-app
docker-compose up -d
```

### ❌ Building Without Reason

**Wrong:**
```bash
# Every time you want to start the app
docker-compose build
docker-compose up -d
```

**Right:**
```bash
# Just start it - pulls from Docker Hub automatically
docker-compose up -d
```

### ❌ Creating New Repository Names

**Wrong:**
```bash
docker tag web-app:latest myusername/new-filamentdb:latest
docker tag web-app:latest pixelplanet/filamentdb:latest  # Wrong username!
```

**Right:**
```bash
docker tag web-app:latest pixelplanet5/filamentdb-app:latest  # Use existing repo
```

---

## 🔍 Debugging

### Container Won't Start

```bash
# Check logs
docker-compose logs

# Check if port 3000 is in use
netstat -ano | findstr :3000  # Windows
lsof -i :3000  # Linux/Mac

# Restart fresh
docker-compose down
docker-compose up -d --pull always
```

### Image Not Updating

```bash
# Force pull latest
docker-compose down
docker pull pixelplanet5/filamentdb-app:latest
docker-compose up -d
```

### "Image Already Exists" Error

This is normal when tagging - it means you're creating a new name for the same image. Multiple tags can point to the same image ID.

---

## 📝 docker-compose.yml Configuration

**Standard Production Config:**

```yaml
version: '3.8'
services:
  web-app:
    image: pixelplanet5/filamentdb-app:latest  # Pull from Docker Hub
    ports:
      - "3000:3000"
    volumes:
      - ./public/downloads:/app/public/downloads
      - ./data:/app/data
    restart: unless-stopped
```

**Development Config** (when testing local changes):

```yaml
version: '3.8'
services:
  web-app:
    build: .  # Build from Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./public/downloads:/app/public/downloads
      - ./data:/app/data
    restart: unless-stopped
```

**⚠️ Important**: Always commit with `image:` not `build:` in the repository.

---

## 🤖 For LLMs: Quick Reference

When the user asks to work with Docker:

1. **Check first**: `docker ps` - Is it already running?
2. **Use docker-compose**: Don't run raw `docker` commands
3. **Repository name**: `pixelplanet5/filamentdb-app` (ONLY this one)
4. **Don't build**: Unless testing new code changes
5. **Update workflow**: Stop → Build → Tag → Push → Clean → Restart with Hub image

**Default command for 99% of cases:**
```bash
cd web-app
docker-compose up -d
```

---

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Hub Repository](https://hub.docker.com/r/pixelplanet5/filamentdb-app)
- Project README: `../README.md`
- Environment Variables: `../ENV_VARIABLES.md`

---

**Last Updated**: 2025-12-28  
**Maintainer**: Pixelplanet5
