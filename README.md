# WasmMedia Studio - Free In-Browser Video & Audio Converter

A modern, high-performance, **100% free** client-side media converter web application powered by **WebAssembly (FFmpeg.wasm)** and **React**.

Unlike traditional conversion sites that charge subscriptions, limit daily conversions, or force users to upload large files to remote servers, **WasmMedia Studio** runs directly inside the user's browser:
- **$0 Running Costs Forever**: Requires no cloud servers, no GPUs, and no backend infrastructure.
- **100% Privacy**: Media files never leave the user's computer. Processing happens directly in device memory.
- **Zero Upload Wait Time**: Large files don't need to be uploaded over slow connections before conversion begins.

---

## Features

- **Convert to MP3**: Extract crystal-clear audio from any video (MP4, WebM, MKV, MOV, AVI, FLV) with selectable bitrates (**128 kbps, 192 kbps, 320 kbps Hi-Fi**).
- **Convert to MP4**: Transcode video files into universal H.264/AAC MP4 format with custom resolution options (Original, 1080p FHD, 720p HD, 480p SD).
- **Studio Audio Formats**: Convert to lossless **WAV** or high-efficiency **AAC**.
- **Media Trimmer / Clipper**: Set precise start and end timestamps to extract specific scenes or audio clips.
- **Audio Volume Booster**: Adjust output volume from 50% up to 200% (2x boost).
- **Built-in Media Players**: Instant in-browser preview for input and converted media files.
- **Live Terminal Logs**: Expandable drawer showing real-time FFmpeg encoding metrics (frame count, bitrate, speed).
- **One-Click Download**: Saves the converted file directly to the user's Downloads folder.

---

## Quick Start (Run Locally)

Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

```bash
# 1. Navigate to the project directory
cd d:\YTtoMP3

# 2. Install dependencies (if not already done)
npm install

# 3. Start the local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Free 1-Click Cloud Deployment

Because this app has no backend dependencies, you can host it for **$0 forever** on any static hosting provider.

### Option 1: Vercel (Recommended)
1. Push this folder to a GitHub repository or install the Vercel CLI (`npm i -g vercel`).
2. Run `vercel` in the project root.
3. The included `vercel.json` already configures the required `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers for WebAssembly multi-threading.

### Option 2: Netlify
1. Drag and drop the `dist/` folder into Netlify Drop, or connect your GitHub repo.
2. Build command: `npm run build`
3. Publish directory: `dist`
4. The included `public/_headers` file will automatically configure the required COOP/COEP security headers.

---

## Tech Stack

- **Frontend**: React 18, Vite 5
- **Styling**: Tailwind CSS, Lucide React Icons
- **Transcoding Engine**: `@ffmpeg/ffmpeg` (v0.12.x), `@ffmpeg/util`, WebAssembly
