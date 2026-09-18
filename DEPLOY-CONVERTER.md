# Real YouTube conversion deployment

The previous UI created placeholder Blob data, so downloaded MP4 files were not real video files. This version calls the `server/` backend, which uses yt-dlp + FFmpeg to create genuine media files.

## 1. Deploy the backend

Deploy `server/` as a Docker web service on Render, Railway, Fly.io, or a VPS. The container listens on port 8080.

After deployment, verify:

`https://YOUR-BACKEND-DOMAIN/health`

It should return JSON containing `"ok":true`.

## 2. Configure the frontend

Create `.env.local` (or configure the Vercel environment variable) with:

`VITE_CONVERTER_API_URL=https://YOUR-BACKEND-DOMAIN`

Redeploy the frontend with Vercel.

## 3. Custom API subdomain (optional)

You can point `api.converter24.store` at the backend and then set:

`VITE_CONVERTER_API_URL=https://api.converter24.store`

The existing `converter24.store` frontend can remain on Vercel.

## Important

Only use the converter for videos/media you are authorized to download or convert.
