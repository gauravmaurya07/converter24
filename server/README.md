# converter24 media API

Express + yt-dlp + FFmpeg. A conversion runs as a background job, so no HTTP request stays open for minutes.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Status: yt-dlp version, PO-token provider state, queue length |
| `POST /api/jobs` | Body `{ "url", "format": "mp4\|mp3\|wav", "quality" }` -> `202 { id }` |
| `GET /api/jobs/:id` | `{ status: queued\|running\|done\|error, stage, progress, title, size, error, errorCode }` |
| `GET /api/jobs/:id/file` | The finished file (streamed, Range supported). Kept for 20 minutes |

MP4 output is H.264 + AAC (plays on every phone/TV/browser). Every finished file is checked with `ffprobe` before it is offered for download.

## Deploy on Render
Web Service -> Docker, **Root Directory `server`**, leave **Docker Command empty**, Health Check Path `/health`.
After deploying, open `https://YOUR-SERVICE.onrender.com/health`. You want:
`{"ok":true,"ytdlp":"2026.x.x","pot":{"installed":true,"running":true,...}}`

To get the newest yt-dlp: Manual Deploy -> **Clear build cache & deploy** (YouTube changes often; do this whenever conversions start failing).

## Run on your own PC (Windows)
```powershell
winget install OpenJS.NodeJS.LTS Gyan.FFmpeg yt-dlp.yt-dlp
cd server
npm install
npm start          # http://localhost:8080
```
Frontend: put `VITE_CONVERTER_API_URL=http://localhost:8080` in `.env.local` and run `npm run dev`.
(The PO-token provider is optional locally; it is only started when `POT_SERVER_DIR` points at a built copy.)

## Settings (all optional environment variables)
| Variable | Default | Meaning |
|---|---|---|
| `ALLOWED_ORIGINS` | converter24.store, www., `*.vercel.app`, localhost:5173 | Comma-separated sites allowed to call the API |
| `MAX_DURATION_SECONDS` | 1800 | Longest video accepted |
| `MAX_FILE_MB` | 500 | Largest output file |
| `MAX_CONCURRENT` / `MAX_QUEUE` | 1 / 8 | Parallel conversions / waiting jobs |
| `JOBS_PER_HOUR_PER_IP` | 20 | Per-visitor rate limit |
| `JOB_TTL_MINUTES` | 20 | How long a finished file stays downloadable |
| `YTDLP_PROXY` | - | Proxy URL passed to yt-dlp (`--proxy`) |
| `YTDLP_PLAYER_CLIENTS` | - | Override yt-dlp's YouTube client list (default: yt-dlp's own, which it keeps current) |
| `YTDLP_EXTRA_ARGS` | - | Extra yt-dlp flags, space separated |
| `YTDLP_BIN` | `yt-dlp` | Path to yt-dlp if it is not on PATH |

## Bot check ("Sign in to confirm you're not a bot")
YouTube decides this mainly from the server's IP address. Cloud hosts (Render, AWS, Google Cloud ...) are often flagged no matter what software runs on them, and no code change can promise otherwise. Options:
1. Run this same server on a machine with an ordinary home/office connection.
2. Send yt-dlp's traffic through a proxy with a clean IP: set `YTDLP_PROXY` (e.g. `http://user:pass@host:port`).
3. Serve only videos you own / that are licensed for reuse, or convert files people upload themselves (the in-browser FFmpeg tools already do this).

Use the converter only for videos you own or are authorised to download.
