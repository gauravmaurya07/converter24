import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const app = express();
const PORT = process.env.PORT || 8080;
const MAX_DURATION_SECONDS = 30 * 60;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const YTDLP_COMMON_ARGS = [
  '--js-runtimes', 'node',
  '--extractor-args', 'youtubepot-bgutilhttp:base_url=http://127.0.0.1:4416'
];

app.use(cors({ origin: true }));
app.use(express.json({ limit: '100kb' }));

const isYouTubeUrl = (value) => {
  try {
    const u = new URL(value);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'youtu.be', 'music.youtube.com'].includes(host);
  } catch {
    return false;
  }
};

function run(command, args, { cwd, onStdout } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (onStdout) onStdout(chunk.toString());
    });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `Command failed with exit code ${code}`));
    });
  });
}

function cleanName(name) {
  return (name || 'converter24_download')
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'converter24_download';
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'converter24-media-api' }));

app.get('/api/convert', async (req, res) => {
  const { url, format = 'mp4', quality = '1080' } = req.query;
  if (!url || !isYouTubeUrl(url)) return res.status(400).json({ error: 'Please provide a valid YouTube URL.' });
  if (!['mp3', 'mp4', 'wav'].includes(format)) return res.status(400).json({ error: 'Unsupported format.' });

  const id = crypto.randomUUID();
  const workDir = path.join(os.tmpdir(), `converter24-${id}`);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const infoResult = await run('yt-dlp', [
      ...YTDLP_COMMON_ARGS,
      '--dump-single-json', '--skip-download', '--no-playlist', '--no-warnings', url
    ]);
    const info = JSON.parse(infoResult.stdout);
    const duration = Number(info.duration || 0);
    if (duration && duration > MAX_DURATION_SECONDS) {
      return res.status(413).json({ error: 'This video is longer than the 30-minute limit.' });
    }
    const title = cleanName(info.title);
    let args;

    if (format === 'mp3') {
      const bitrate = ['128', '192', '256', '320'].includes(String(quality)) ? String(quality) : '320';
      args = [...YTDLP_COMMON_ARGS, '--no-playlist', '--max-filesize', '500M', '-x', '--audio-format', 'mp3', '--audio-quality', `${bitrate}K`, '-o', path.join(workDir, `${title}.%(ext)s`), url];
    } else if (format === 'wav') {
      args = [...YTDLP_COMMON_ARGS, '--no-playlist', '--max-filesize', '500M', '-x', '--audio-format', 'wav', '-o', path.join(workDir, `${title}.%(ext)s`), url];
    } else {
      const height = ['360', '480', '720', '1080'].includes(String(quality)) ? String(quality) : '1080';
      args = [...YTDLP_COMMON_ARGS, '--no-playlist', '--max-filesize', '500M', '-f', `bv*[height<=${height}]+ba/b[height<=${height}]`, '--merge-output-format', 'mp4', '-o', path.join(workDir, `${title}.%(ext)s`), url];
    }

    await run('yt-dlp', args, { cwd: workDir });
    const files = fs.readdirSync(workDir).filter((f) => !f.endsWith('.part'));
    const output = files.find((f) => f.toLowerCase().endsWith(`.${format}`)) || files[0];
    if (!output) throw new Error('Conversion finished but no output file was created.');

    const outputPath = path.join(workDir, output);
    const stat = fs.statSync(outputPath);
    if (stat.size === 0 || stat.size > MAX_FILE_SIZE) throw new Error('The generated file is invalid or too large.');

    const mime = format === 'mp3' ? 'audio/mpeg' : format === 'wav' ? 'audio/wav' : 'video/mp4';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(output)}"`);
    res.setHeader('Cache-Control', 'no-store');
    const stream = fs.createReadStream(outputPath);
    stream.on('error', (err) => { if (!res.headersSent) res.status(500).json({ error: err.message }); });
    stream.pipe(res);
    const cleanup = () => fs.rm(workDir, { recursive: true, force: true }, () => {});
    res.on('finish', cleanup);
    res.on('close', cleanup);
  } catch (error) {
    fs.rm(workDir, { recursive: true, force: true }, () => {});
    console.error('[converter24] conversion error:', error?.message || error);
    if (!res.headersSent) res.status(500).json({ error: 'Conversion failed. Please try another video.' });
  }
});

app.listen(PORT, () => console.log(`converter24 media API listening on ${PORT}`));
