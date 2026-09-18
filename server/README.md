# converter24 media API

This backend performs real YouTube media conversion with yt-dlp + FFmpeg. Deploy it as a container service (Render, Railway, Fly.io, VPS, etc.).

Health check: `/health`
Conversion: `/api/convert?url=<youtube-url>&format=mp4&quality=1080`

Use only for media you are authorized to download/convert.
