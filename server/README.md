# converter24 Media API

Express + yt-dlp + FFmpeg backend for converter24. The Docker image also runs the BgUtils PO-token provider locally so yt-dlp can handle current YouTube PO-token requirements.

## Endpoints
- `GET /health`
- `GET /api/convert?url=...&format=mp4|mp3|wav&quality=...`

The service is intended for videos you are authorized to download or convert.
