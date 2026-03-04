# CI/CD Setup Guide

## Overview

This project uses GitHub Actions for:

- **CI** (`.github/workflows/ci.yml`): Runs on every push/PR to `shalev`, `hadar`, `tal` — validates builds
- **CD** (`.github/workflows/deploy-production.yml`): Runs on push to `main` — deploys to production

---

## CI Pipeline

The CI workflow automatically:

1. Installs backend dependencies
2. Installs frontend dependencies and builds the React app

No configuration needed — it runs automatically when you push or open a PR.

---

## CD Pipeline (Production Deployment)

### Option A: Render (Recommended)

1. Create a [Render](https://render.com) account and connect your GitHub repo
2. Create two services:
   - **Backend**: Web Service, root directory `smart-crosswalk/backend`, start command `npm start`
   - **Frontend**: Static Site, root directory `smart-crosswalk/frontend`, build command `npm run build`, publish directory `dist`
3. For each service, go to **Settings → Deploy Hook** and copy the webhook URL
4. Add these as GitHub Secrets (Settings → Secrets and variables → Actions):
   - `RENDER_BACKEND_DEPLOY_HOOK` — Backend deploy hook URL
   - `RENDER_FRONTEND_DEPLOY_HOOK` — Frontend deploy hook URL
5. Add `VITE_API_URL` — Your production API URL (e.g. `https://your-backend.onrender.com/api`)

### Option B: Manual Deploy

If you use a different platform (Railway, Fly.io, Vercel, etc.), you can:

- Remove or disable the deploy steps in `deploy-production.yml`
- Use the platform's built-in GitHub integration for auto-deploy
- Or trigger deploys manually via `workflow_dispatch`

---

## Environment Variables

### Backend (Production)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | Provided by hosting (e.g. Render) |
| `MONGODB_URI` | Production MongoDB Atlas connection string |
| `CORS_ORIGIN` | Your frontend URL (e.g. `https://your-app.onrender.com`) |
| `CLOUDINARY_*` | Production Cloudinary credentials |

### Frontend (Build-time)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Full API URL (e.g. `https://your-backend.onrender.com/api`) |

---

## Security Note

**Important**: Rotate your MongoDB and Cloudinary credentials. The previous values in `.env.example` have been removed — create new credentials and update your local `.env` and production environment variables.
