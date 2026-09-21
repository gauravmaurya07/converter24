// converter24 media API
// Express + yt-dlp + FFmpeg. Conversion runs as a background job so no single
// HTTP request has to stay open for minutes (Render, Cloudflare and mobile
// networks all cut long-idle requests).
//
//   POST /api/jobs            {url, format, quality}  -> 202 {id}
//   GET  /api/jobs/:id        -> {status, stage, progress, title, size, ...}
//   GET  /api/jobs/:id/file   -> the finished mp4 / mp3 / wav (Range supported)
//   GET  /health              -> service + yt-dlp + PO-token provider status

import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const SECRET_COOKIES = '/etc/secrets/cookies.txt';
const COOKIES = '/tmp/cookies.txt';

if (fs.existsSync(SECRET_COOKIES)) {
  fs.copyFileSync(SECRET_COOKIES, COOKIES);
}

const cookieArgs = fs.existsSync(COOKIES) ? ['--cookies', COOKIES] : [];
console.log(new Date().toISOString(), '[startup] cookies file present:', fs.existsSync(COOKIES));

/* ------------------------------------------------------------------ config */

const env = process.env;
const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

const CONFIG = {
  port: num(env.PORT, 8080),
  ytdlp: env.YTDLP_BIN || 'yt-dlp',
  ffprobe: env.FFPROBE_BIN || 'ffprobe',
  maxDurationSec: num(env.MAX_DURATION_SECONDS, 30 * 60),
  maxFileMB: num(env.MAX_FILE_MB, 500),
  maxConcurrent: num(env.MAX_CONCURRENT, 1),
  maxQueue: num(env.MAX_QUEUE, 8),
  jobTtlMs: num(env.JOB_TTL_MINUTES, 20) * 60_000,
  jobTimeoutMs: num(env.JOB_TIMEOUT_SECONDS, 600) * 1000,
  jobsPerHourPerIp: num(env.JOBS_PER_HOUR_PER_IP, 20),
  trustProxyHops: num(env.TRUST_PROXY_HOPS, 1),
  proxy: env.YTDLP_PROXY || '',
  playerClients: env.YTDLP_PLAYER_CLIENTS || '',
  extraArgs: (env.YTDLP_EXTRA_ARGS || '').split(/\s+/).filter(Boolean),
  potDir: env.POT_SERVER_DIR || '',
  potPort: num(env.POT_PORT, 4416),
  allowedOrigins: (
    env.ALLOWED_ORIGINS ||
    'https://converter24.store,https://www.converter24.store,https://*.vercel.app,http://localhost:5173,http://127.0.0.1:5173'
  )
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};

const FORMATS = ['mp4', 'mp3', 'wav'];
const MP4_HEIGHTS = ['360', '480', '720', '1080'];
const MP3_BITRATES = ['128', '192', '256', '320'];

const log = (...a) => console.log(new Date().toISOString(), ...a);

// yt-dlp starts ffmpeg as a child; kill the whole tree so nothing is left running.
function killTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return;
  try {
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {}
  }
}

/* -------------------------------------------------------------------- CORS */

function originAllowed(origin) {
  return CONFIG.allowedOrigins.some((rule) => {
    if (rule === '*') return true;
    if (!rule.includes('*')) return rule === origin;
    const re = new RegExp('^' + rule.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]+') + '$');
    return re.test(origin);
  });
}

/* --------------------------------------------------- PO-token provider (bgutil) */
// yt-dlp asks a small local HTTP server for YouTube "proof of origin" tokens.
// We start it from here (absolute paths, no shell script, no Docker ENTRYPOINT
// tricks) and restart it if it ever exits.

const pot = { enabled: false, child: null, restarts: 0 };
let shuttingDown = false;

function startPot() {
  const main = CONFIG.potDir ? path.join(CONFIG.potDir, 'build', 'main.js') : '';
  if (!main || !fs.existsSync(main)) {
    log('[pot] provider not installed (POT_SERVER_DIR unset or build/main.js missing) - continuing without it');
    return;
  }
  pot.enabled = true;
  const child = spawn(process.execPath, [main, '--host', '127.0.0.1', '--port', String(CONFIG.potPort)], {
    cwd: CONFIG.potDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  pot.child = child;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (d) => log('[pot]', d.trim()));
  child.stderr.on('data', (d) => log('[pot:err]', d.trim()));
  child.on('error', (e) => log('[pot] failed to start:', e.message));
  child.on('exit', (code, sig) => {
    pot.child = null;
    if (shuttingDown) return;
    const wait = Math.min(30_000, 1000 * 2 ** Math.min(pot.restarts++, 5));
    log(`[pot] exited (code=${code} signal=${sig}); restarting in ${wait}ms`);
    setTimeout(startPot, wait).unref();
  });
}

async function potStatus() {
  if (!pot.enabled) return { installed: false, running: false };
  try {
    const r = await fetch(`http://127.0.0.1:${CONFIG.potPort}/ping`, { signal: AbortSignal.timeout(1000) });
    const j = await r.json();
    return { installed: true, running: true, version: j.version };
  } catch {
    return { installed: true, running: false };
  }
}

/* ------------------------------------------------------------------ helpers */

function parseYouTubeUrl(value) {
  if (typeof value !== 'string' || value.length > 300) return null;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function cleanName(name) {
  return (
    (name || '')
      .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'converter24_download'
  );
}

const ERROR_MESSAGES = {
  bad_request: 'Please provide a valid YouTube link.',
  bad_format: 'Unsupported format or quality.',
  rate_limited_client: 'Too many conversions from your network. Please try again later.',
  busy: 'The server is busy right now. Please try again in a minute.',
  not_found: 'This conversion has expired. Please start again.',
  bot_check: 'YouTube is blocking this server right now, so the video could not be fetched. Please try again later.',
  yt_rate_limit: 'YouTube is rate-limiting this server. Please try again in a few minutes.',
  age_restricted: 'This video is age-restricted and cannot be converted.',
  unavailable: 'This video is private, removed or unavailable.',
  blocked: 'This video is blocked (copyright or region restriction).',
  live: 'Live streams and premieres cannot be converted.',
  too_long: `This video is live or longer than the ${Math.round(CONFIG.maxDurationSec / 60)}-minute limit.`,
  too_large: `The file would be larger than the ${CONFIG.maxFileMB} MB limit. Try a lower quality.`,
  no_format: 'No downloadable format was found at this quality. Try a different quality.',
  network: 'Could not reach YouTube from the server. Please try again.',
  timeout: 'The conversion took too long and was cancelled. Try a lower quality or a shorter video.',
  invalid_output: 'The converted file was not valid. Please try again.',
  server_misconfigured: 'The conversion server is not set up correctly (yt-dlp missing).',
  failed: 'Conversion failed. Please try another video.',
};

function classify(text) {
  const t = text || '';
  if (/confirm you.{0,4}re not a bot/i.test(t)) return 'bot_check';
  if (/confirm your age|age-restricted|inappropriate for some users/i.test(t)) return 'age_restricted';
  if (/HTTP Error 429|Too Many Requests/i.test(t)) return 'yt_rate_limit';
  if (/live event|is_live|premieres in|this live/i.test(t)) return 'live';
  if (/blocked it|copyright|not available in your country|geo.?restrict/i.test(t)) return 'blocked';
  if (/Video unavailable|Private video|has been removed|no longer available|account associated|not available/i.test(t)) return 'unavailable';
  if (/larger than max-filesize|File is larger/i.test(t)) return 'too_large';
  if (/Requested format is not available|No video formats found/i.test(t)) return 'no_format';
  if (/Temporary failure|timed out|Connection (reset|refused)|Unable to download (webpage|API)|getaddrinfo/i.test(t)) return 'network';
  return 'failed';
}

/* -------------------------------------------------------------- yt-dlp args */

function buildArgs(job) {
  const out = path.join(job.dir, '%(id)s.%(ext)s');
  const args = [
    '--ignore-config',
    '--no-playlist',
    '--no-color',
    '--newline',
    '--no-quiet',
    '--progress',
    '--no-simulate',
    '--js-runtimes', 'node',
    '--socket-timeout', '30',
    '--retries', '3',
    '--fragment-retries', '3',
    '--concurrent-fragments', '8',
    '--max-filesize', `${CONFIG.maxFileMB}M`,
    '--break-match-filters', `duration <=? ${CONFIG.maxDurationSec} & !is_live`,
    '--progress-template',
    'download:C24P|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.filename)s',
    '--print', 'before_dl:C24META|%(.{id,title,duration})j',
    '--print', 'after_move:C24FILE|%(filepath)s',
    '-o', out,
  ];

  if (CONFIG.proxy) args.push('--proxy', CONFIG.proxy);
  if (CONFIG.playerClients) args.push('--extractor-args', `youtube:player_client=${CONFIG.playerClients}`);
  args.push(...cookieArgs);
  if (pot.enabled) args.push('--extractor-args', `youtubepot-bgutilhttp:base_url=http://127.0.0.1:${CONFIG.potPort}`);

  if (job.format === 'mp3') {
    args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', `${job.quality}K`);
  } else if (job.format === 'wav') {
    args.push('-f', 'ba/b', '-x', '--audio-format', 'wav');
  } else {
    // H.264 + AAC inside MP4 plays on every phone, TV and browser.
    args.push(
      '-f',
      `bv*[height<=${job.quality}][ext=mp4]+ba[ext=m4a]/b[height<=${job.quality}][ext=mp4]/b`,
      '--merge-output-format',
      'mp4',
      '--remux-video',
      'mp4'
    );
  }

  args.push(...CONFIG.extraArgs, '--', job.url);
  return args;
}

/* ---------------------------------------------------------------- job store */

const jobs = new Map();
const queue = [];
let active = 0;
const clientHits = new Map(); // ip -> [timestamps]

function removeJob(job) {
  jobs.delete(job.id);
  const qi = queue.indexOf(job);
  if (qi >= 0) queue.splice(qi, 1);
  if (job.proc) {
    job.cancelled = true;
    killTree(job.proc);
  }
  fs.rm(job.dir, { recursive: true, force: true }, () => {});
}

function sweep() {
  const now = Date.now();
  for (const job of jobs.values()) {
    const ttl = job.status === 'error' ? 5 * 60_000 : CONFIG.jobTtlMs;
    if ((job.status === 'done' || job.status === 'error') && now - job.finishedAt > ttl) removeJob(job);
    else if (job.status === 'queued' && now - job.createdAt > 30 * 60_000) removeJob(job);
  }
  for (const [ip, hits] of clientHits) {
    const recent = hits.filter((t) => now - t < 3_600_000);
    if (recent.length) clientHits.set(ip, recent);
    else clientHits.delete(ip);
  }
}

function pump() {
  while (active < CONFIG.maxConcurrent && queue.length) {
    const job = queue.shift();
    if (job.status !== 'queued') continue;
    active++;
    runJob(job)
      .catch((e) => fail(job, 'failed', e?.message || String(e)))
      .finally(() => {
        active--;
        pump();
      });
  }
}

function fail(job, code, detail) {
  if (job.cancelled) return;
  job.status = 'error';
  job.errorCode = code;
  job.error = ERROR_MESSAGES[code] || ERROR_MESSAGES.failed;
  job.finishedAt = Date.now();
  log(`[job ${job.id.slice(0, 8)}] FAILED ${code}: ${(detail || '').toString().trim().slice(-1500)}`);
}

async function probeOk(file) {
  // Confirms the finished file is a real, readable media file.
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(CONFIG.ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      return resolve(true);
    }
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.on('error', () => resolve(true)); // ffprobe not installed: skip the check
    child.on('close', (code) => resolve(code === 0 && Number.isFinite(parseFloat(out)) && parseFloat(out) > 0));
  });
}

function findOutput(job) {
  if (job.filePath && fs.existsSync(job.filePath)) return job.filePath;
  const files = fs
    .readdirSync(job.dir)
    .filter((f) => f.toLowerCase().endsWith(`.${job.format}`))
    .map((f) => path.join(job.dir, f));
  files.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size);
  return files[0] || null;
}

async function runJob(job) {
  job.status = 'running';
  job.stage = 'connecting';
  job.progress = 5;

  let child;
  try {
    child = spawn(CONFIG.ytdlp, buildArgs(job), {
      cwd: job.dir,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: process.platform !== 'win32', // own process group so killTree can stop ffmpeg too
    });
  } catch (e) {
    return fail(job, 'server_misconfigured', e.message);
  }
  job.proc = child;
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  const expectedStreams = job.format === 'mp4' ? 2 : 1;
  const fractions = new Map();
  let stderrTail = '';
  let buffer = '';

const onLine = (line) => {
  if (!line) return;

  // Connecting to YouTube
  if (/Extracting URL/i.test(line)) {
    job.stage = 'connecting';
    job.progress = Math.max(job.progress, 5);
  }

  // Verifying video
  if (/Downloading webpage|Downloading player/i.test(line)) {
    job.stage = 'verifying';
    job.progress = Math.max(job.progress, 10);
  }

  // Fetching video information / formats
  if (
    /Downloading .*API JSON/i.test(line) ||
    /Downloading .*player/i.test(line) ||
    /Fetching/i.test(line)
  ) {
    job.stage = 'fetching_formats';
    job.progress = Math.max(job.progress, 15);
  }

  // Metadata received
  if (line.startsWith('C24META|')) {
    try {
      const meta = JSON.parse(line.slice(8));

      if (meta.title) {
        job.title = cleanName(meta.title);
      }

      job.duration = Number(meta.duration) || 0;
    } catch {}

    job.stage = 'fetching_formats';
    job.progress = Math.max(job.progress, 15);
  }

  // Download progress
  else if (line.startsWith('C24P|')) {
    const [, done, total, est, name] = line.split('|');

    const d = Number(done);
    const t = Number(total) || Number(est);

    if (Number.isFinite(d) && t > 0) {
      const fraction = Math.min(1, d / t);

      fractions.set(name, fraction);

      const entries = [...fractions.entries()];

      if (job.format === 'mp4') {
        if (entries.length <= 1) {
          // Video: 20% → 75%
          job.stage = 'downloading_video';

          job.progress = Math.max(
            job.progress,
            Math.round(20 + fraction * 55)
          );
        } else {
          // Audio: 75% → 88%
          const audioFraction = entries[entries.length - 1][1];

          job.stage = 'downloading_audio';

          job.progress = Math.max(
            job.progress,
            Math.round(75 + audioFraction * 13)
          );
        }
      } else {
        // MP3 / WAV
        job.stage = 'downloading_audio';

        job.progress = Math.max(
          job.progress,
          Math.round(20 + fraction * 68)
        );
      }
    }
  }

  // Output file detected
  else if (line.startsWith('C24FILE|')) {
    job.filePath = line.slice(8).trim();
  }

  // FFmpeg / processing
  else if (
    /^\[(Merger|VideoRemuxer|ExtractAudio|ffmpeg|FixupM4a|FixupM3u8|MoveFiles)\]/i.test(line)
  ) {
    job.stage = 'processing';
    job.progress = Math.max(job.progress, 90);
  }
};

  child.stdout.on('data', (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf('\n')) >= 0) {
      onLine(buffer.slice(0, i).trim());
      buffer = buffer.slice(i + 1);
    }
  });
  child.stderr.on('data', (chunk) => {
    stderrTail = (stderrTail + chunk).slice(-4000);
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    killTree(child);
  }, CONFIG.jobTimeoutMs);

  let spawnError = null;
  const code = await new Promise((resolve) => {
    child.on('error', (e) => {
      spawnError = e;
      resolve(-1);
    });
    child.on('close', resolve);
  });
  clearTimeout(timer);
  job.proc = null;
  if (job.cancelled) return;

  if (spawnError) return fail(job, spawnError.code === 'ENOENT' ? 'server_misconfigured' : 'failed', spawnError.message);
  if (timedOut) return fail(job, 'timeout', 'job timed out');
  if (code === 101) return fail(job, 'too_long', 'rejected by --break-match-filters');
  if (code !== 0) return fail(job, classify(stderrTail), stderrTail);

  const file = findOutput(job);
  if (!file) return fail(job, 'failed', 'yt-dlp exited 0 but no output file was found');
  const size = fs.statSync(file).size;
  if (size === 0 || size > CONFIG.maxFileMB * 1024 * 1024) return fail(job, 'too_large', `size=${size}`);
  if (!(await probeOk(file))) return fail(job, 'invalid_output', `ffprobe rejected ${file}`);

  job.file = file;
  job.size = size;
  job.downloadName = `${job.title || 'converter24_download'}.${job.format}`;
  job.status = 'done';
  job.stage = 'done';
  job.progress = 100;
  job.finishedAt = Date.now();
  log(`[job ${job.id.slice(0, 8)}] done ${job.format} ${(size / 1048576).toFixed(1)} MB in ${((Date.now() - job.createdAt) / 1000).toFixed(0)}s`);
}

/* --------------------------------------------------------------------- app */

const app = express();
app.set('trust proxy', CONFIG.trustProxyHops);
app.disable('x-powered-by');
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || originAllowed(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
    exposedHeaders: ['Content-Disposition', 'Content-Length'],
    maxAge: 86400,
  }),
);
app.use((_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
app.use(express.json({ limit: '10kb' }));

const sendError = (res, status, code) => res.status(status).json({ error: ERROR_MESSAGES[code], code });

let ytdlpVersion = null;

app.get('/health', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    service: 'converter24-media-api',
    ytdlp: ytdlpVersion || 'not found',
    pot: await potStatus(),
    active,
    queued: queue.length,
  });
});

app.post('/api/jobs', (req, res) => {
  const body = req.body || {};
  const url = parseYouTubeUrl(body.url);
  if (!url) return sendError(res, 400, 'bad_request');

  const format = String(body.format || 'mp4');
  const quality = String(body.quality || '');
  if (!FORMATS.includes(format)) return sendError(res, 400, 'bad_format');
  const q = format === 'mp4' ? (MP4_HEIGHTS.includes(quality) ? quality : '1080') : format === 'mp3' ? (MP3_BITRATES.includes(quality) ? quality : '320') : 'lossless';

  const ip = req.ip || 'unknown';
  const hits = (clientHits.get(ip) || []).filter((t) => Date.now() - t < 3_600_000);
  if (hits.length >= CONFIG.jobsPerHourPerIp) return sendError(res, 429, 'rate_limited_client');
  if (queue.length >= CONFIG.maxQueue) return sendError(res, 503, 'busy');
  hits.push(Date.now());
  clientHits.set(ip, hits);

  const id = crypto.randomUUID();
  const dir = path.join(os.tmpdir(), `converter24-${id}`);
  fs.mkdirSync(dir, { recursive: true });
  const job = { id, url, format, quality: q, dir, status: 'queued', stage: 'queued', progress: 0, createdAt: Date.now() };
  jobs.set(id, job);
  queue.push(job);
  log(`[job ${id.slice(0, 8)}] queued ${format}/${q} from ${ip}`);
  pump();
  res.status(202).json({ id, status: job.status });
});

app.get('/api/jobs/:id', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const job = jobs.get(req.params.id);
  if (!job) return sendError(res, 404, 'not_found');
  res.json({
    id: job.id,
    status: job.status,
    stage: job.stage,
    progress: job.progress,
    queuePosition: job.status === 'queued' ? queue.indexOf(job) + 1 : 0,
    title: job.title || null,
    format: job.format,
    quality: job.quality,
    size: job.size || null,
    filename: job.downloadName || null,
    error: job.error || null,
    errorCode: job.errorCode || null,
  });
});

app.get('/api/jobs/:id/file', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== 'done' || !fs.existsSync(job.file)) return sendError(res, 404, 'not_found');
  res.download(job.file, job.downloadName, { headers: { 'Cache-Control': 'no-store' } }, (err) => {
    if (err && !res.headersSent) sendError(res, 500, 'failed');
  });
});

app.use((_req, res) => res.status(404).json({ error: 'Not found', code: 'not_found' }));
app.use((err, _req, res, _next) => {
  log('[http] error:', err?.message || err);
  if (!res.headersSent) res.status(400).json({ error: ERROR_MESSAGES.bad_request, code: 'bad_request' });
});

/* ------------------------------------------------------------------ startup */

function detectYtdlp() {
  const c = spawn(CONFIG.ytdlp, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  c.stdout.on('data', (d) => (out += d));
  c.on('error', (e) => log(`[startup] cannot run "${CONFIG.ytdlp}": ${e.message}  <-- conversions will fail until yt-dlp is installed`));
  c.on('close', (code) => {
    if (code === 0) {
      ytdlpVersion = out.trim();
      log(`[startup] yt-dlp ${ytdlpVersion}`);
    }
  });
}

// Remove leftovers from a previous run.
for (const f of fs.readdirSync(os.tmpdir())) {
  if (f.startsWith('converter24-')) fs.rmSync(path.join(os.tmpdir(), f), { recursive: true, force: true });
}

startPot();
detectYtdlp();
setInterval(sweep, 30_000).unref();

const server = app.listen(CONFIG.port, () => log(`converter24 media API listening on ${CONFIG.port}`));

function shutdown() {
  shuttingDown = true;
  for (const job of jobs.values()) killTree(job.proc);
  if (pot.child) pot.child.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (e) => log('[unhandledRejection]', e));
