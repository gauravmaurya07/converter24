import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Clipboard, 
  X, 
  Music, 
  Video, 
  Download, 
  RefreshCcw, 
  Loader2, 
  CheckCircle2, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  Copy,
  Check,
  Radio
} from 'lucide-react';
import { youtubeService } from '../services/youtubeService';
import { isConfigured, wakeServer, startJob, pollJob, fileUrl } from '../services/converterApi';

export default function YTConverterCard() {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('mp3'); // 'mp3' | 'mp4' | 'wav' | 'thumbnail'
  const [quality, setQuality] = useState('320'); // dynamic based on format
  const [videoInfo, setVideoInfo] = useState(null);
  const [isLoadingMeta, setIsLoadingMeta] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'converting' | 'completed' | 'error'
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isExtractingThumb, setIsExtractingThumb] = useState(false);
  const abortRef = useRef(null);

  // Stop polling if the component goes away mid-conversion
  useEffect(() => () => abortRef.current?.abort(), []);

  // Update default quality when format changes
  useEffect(() => {
    if (format === 'mp3') {
      setQuality('320');
    } else if (format === 'mp4') {
      setQuality('1080');
    } else if (format === 'wav') {
      setQuality('lossless');
    } else if (format === 'thumbnail') {
      setQuality('maxres');
    }
  }, [format]);

  // Detect YouTube video ID from URL in real-time
  useEffect(() => {
    if (!url.trim()) {
      setVideoInfo(null);
      return;
    }

    const videoId = youtubeService.extractVideoId(url);
    if (videoId) {
      let isMounted = true;
      setIsLoadingMeta(true);
      setErrorMessage('');

      youtubeService.fetchMetadata(videoId).then((info) => {
        if (isMounted && info) {
          setVideoInfo(info);
          setIsLoadingMeta(false);
        }
      }).catch(() => {
        if (isMounted) setIsLoadingMeta(false);
      });

      return () => {
        isMounted = false;
      };
    } else {
      setVideoInfo(null);
    }
  }, [url]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text);
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleClear = () => {
    setUrl('');
    setVideoInfo(null);
    setStatus('idle');
    setProgress(0);
    setErrorMessage('');
    setDownloadUrl(null);
  };

  const handleCopyTitle = () => {
    if (videoInfo?.title) {
      navigator.clipboard.writeText(videoInfo.title);
      setCopiedTitle(true);
      setTimeout(() => setCopiedTitle(false), 2000);
    }
  };

  // Direct 1-Click Thumbnail Extractor
  const handleExtractThumbnail = async (qualityLevel = 'maxres') => {
    const videoId = youtubeService.extractVideoId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video link first');
      return;
    }

    setIsExtractingThumb(true);
    const targetUrl = qualityLevel === 'maxres'
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

    const titleClean = (videoInfo?.title || `youtube_${videoId}`).replace(/[^a-zA-Z0-9_\- ]/g, '').substring(0, 50);
    const filename = `${titleClean}_thumbnail_${qualityLevel}.jpg`;

    try {
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      // Fallback: open image in new tab if cross-origin fetch is blocked
      window.open(targetUrl, '_blank');
    } finally {
      setIsExtractingThumb(false);
    }
  };

  const handleConvert = async () => {
    const videoId = youtubeService.extractVideoId(url);
    if (!videoId) {
      setErrorMessage('Please enter a valid YouTube video link (e.g. https://www.youtube.com/watch?v=...)');
      return;
    }

    // Thumbnail downloads stay client-side.
    if (format === 'thumbnail') {
      await handleExtractThumbnail(quality);
      return;
    }

    if (!isConfigured()) {
      setErrorMessage('The media conversion server is not configured yet.');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    setStatus('converting');
    setProgress(3);
    setErrorMessage('');
    setStatusText('Connecting to the conversion server...');
    const bump = (value) => setProgress((p) => Math.max(p, Math.min(99, value)));

    try {
      // Free hosting sleeps when idle - wait for it to wake up.
      await wakeServer({
        signal,
        onSlow: () => setStatusText('Waking up the server (free hosting can take up to a minute)...'),
      });

      setStatusText('Starting conversion...');
      const { id } = await startJob({ url, format, quality: String(quality) }, signal);

      const job = await pollJob(id, {
        signal,
        onUpdate: (j) => {
          bump(j.progress);
          if (j.status === 'queued') {
            setStatusText(j.queuePosition > 1 ? `Waiting in queue (position ${j.queuePosition})...` : 'Waiting for a free converter...');
          } else if (j.stage === 'fetching') {
            setStatusText('Fetching video information...');
          } else if (j.stage === 'downloading') {
            setStatusText(`Downloading ${format === 'mp4' ? 'video' : 'audio'}... ${Math.min(99, j.progress)}%`);
          } else if (j.stage === 'processing') {
            setStatusText(format === 'mp4' ? 'Merging video and audio into MP4...' : `Converting to ${format.toUpperCase()}...`);
          }
        },
      });

      const titleClean = (videoInfo?.title || `youtube_${videoId}`)
        .replace(/[^a-zA-Z0-9_\- ]/g, '')
        .trim()
        .substring(0, 70) || `youtube_${videoId}`;

      setProgress(100);
      setStatusText('Conversion completed successfully.');
      setDownloadUrl({
        // The browser downloads straight from the server (streamed to disk, no big in-memory Blob).
        url: fileUrl(id),
        filename: job.filename || `${titleClean}.${format}`,
        format: format.toUpperCase(),
        quality: format === 'mp3' ? `${quality} kbps` : format === 'wav' ? 'Lossless WAV' : `${quality}p HD`,
        size: job.size ? `${(job.size / (1024 * 1024)).toFixed(1)} MB` : '',
      });
      setStatus('completed');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setProgress(0);
      setStatus('error');
      setStatusText('');
      setErrorMessage(error?.message || 'Conversion failed. Please try again.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setProgress(0);
    setDownloadUrl(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Central Box */}
      <div className="relative rounded-3xl border border-slate-850 bg-slate-900/80 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-red-600/15 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
            YouTube to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-400">
              MP3, MP4 & Thumbnail
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-lg mx-auto">
            Convert YouTube videos to high-bitrate audio, HD video, or extract maximum resolution thumbnails.
          </p>
        </div>

        {status !== 'completed' ? (
          <div className="space-y-6">
            {/* Input Bar */}
            <div className="relative">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-950 border-2 border-slate-800 focus-within:border-red-500/80 focus-within:shadow-lg focus-within:shadow-red-500/10 transition-all">
                <div className="pl-3.5 text-slate-500">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube link here (e.g. https://www.youtube.com/watch?v=...)"
                  disabled={status === 'converting'}
                  className="w-full bg-transparent px-2 py-3 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
                />

                {url && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition-colors mr-1"
                    title="Clear link"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={status === 'converting'}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-750 transition-colors flex-shrink-0"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Paste</span>
                </button>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 text-xs text-rose-400 mt-2 px-1">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Format & Quality Selector (Stacked Vertically) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-850 space-y-4">
              {/* Row 1: Format Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Select Format:
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {format === 'mp3' && 'High-Bitrate Audio'}
                    {format === 'mp4' && 'Full HD Video'}
                    {format === 'wav' && 'Lossless PCM Studio'}
                    {format === 'thumbnail' && 'Original Video Artwork'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormat('mp3')}
                    disabled={status === 'converting'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      format === 'mp3'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5" />
                    <span>MP3 (Audio)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('mp4')}
                    disabled={status === 'converting'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      format === 'mp4'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>MP4 (Video)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('wav')}
                    disabled={status === 'converting'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      format === 'wav'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>WAV (Studio)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('thumbnail')}
                    disabled={status === 'converting'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all ${
                      format === 'thumbnail'
                        ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Thumbnail</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Quality Selector (Directly Below Format) */}
              <div className="pt-3 border-t border-slate-850/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Quality / Resolution:
                  </span>
                  <span className="text-xs font-mono text-red-400 font-semibold">
                    {format === 'mp3' && `${quality} kbps`}
                    {format === 'mp4' && `${quality}p`}
                    {format === 'wav' && '1411 kbps'}
                    {format === 'thumbnail' && (quality === 'maxres' ? '1080p (1920x1080)' : '720p (1280x720)')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {format === 'mp3' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setQuality('320')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '320'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>320 kbps</div>
                        <div className="text-[10px] text-slate-500 font-normal">Hi-Fi Ultra Studio</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('192')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '192'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>192 kbps</div>
                        <div className="text-[10px] text-slate-500 font-normal">High Quality (Standard)</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('128')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '128'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>128 kbps</div>
                        <div className="text-[10px] text-slate-500 font-normal">Compact / Smaller File</div>
                      </button>
                    </>
                  )}

                  {format === 'mp4' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setQuality('1080')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '1080'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>1080p Full HD</div>
                        <div className="text-[10px] text-slate-500 font-normal">Best Video & Sound</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('720')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '720'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>720p HD</div>
                        <div className="text-[10px] text-slate-500 font-normal">Standard High Def</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('480')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === '480'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>480p SD</div>
                        <div className="text-[10px] text-slate-500 font-normal">Fast / Data Saver</div>
                      </button>
                    </>
                  )}

                  {format === 'wav' && (
                    <button
                      type="button"
                      disabled
                      className="col-span-2 sm:col-span-3 py-2.5 px-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs font-semibold text-center"
                    >
                      <div>1411 kbps Uncompressed PCM Audio</div>
                      <div className="text-[10px] text-slate-400 font-normal">Studio Master Audio Quality</div>
                    </button>
                  )}

                  {format === 'thumbnail' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setQuality('maxres')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === 'maxres'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>1080p Max Resolution</div>
                        <div className="text-[10px] text-slate-500 font-normal">Original 1920x1080 Artwork</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuality('hq')}
                        disabled={status === 'converting'}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                          quality === 'hq'
                            ? 'border-red-500 bg-red-500/15 text-red-300 shadow-sm'
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700'
                        }`}
                      >
                        <div>720p High Quality</div>
                        <div className="text-[10px] text-slate-500 font-normal">1280x720 Thumbnail</div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Video Preview Card with Instant Quick Action Toolbar */}
            {videoInfo && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 transition-all animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className="relative w-28 sm:w-36 h-20 sm:h-24 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800 group">
                    <img
                      src={videoInfo.thumbnail}
                      onError={(e) => {
                        if (videoInfo.fallbackThumbnail) {
                          e.target.src = videoInfo.fallbackThumbnail;
                        }
                      }}
                      alt={videoInfo.title}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/80 text-white font-mono">
                      HD
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 mb-1">
                      YouTube Video
                    </span>
                    <h4 className="text-sm font-semibold text-white truncate line-clamp-2 leading-snug">
                      {videoInfo.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Channel: <span className="text-slate-300 font-medium">{videoInfo.author}</span>
                    </p>
                  </div>
                </div>

                {/* Quick Actions Strip */}
                <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleExtractThumbnail('maxres')}
                    disabled={isExtractingThumb}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                    title="Download 1080p Thumbnail directly"
                  >
                    {isExtractingThumb ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>Download 1080p Thumbnail</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTitle}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
                  >
                    {copiedTitle ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Title Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Title</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://www.youtube.com/watch?v=${videoInfo.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors ml-auto"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View on YouTube</span>
                  </a>
                </div>
              </div>
            )}

            {/* Convert Button or Progress Bar */}
            {status === 'converting' ? (
              <div className="p-6 rounded-2xl bg-slate-950 border border-red-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                    <span>{statusText}</span>
                  </div>
                  <span className="font-mono text-red-400 font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleConvert}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-base sm:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {format === 'thumbnail'
                    ? 'Download HD Thumbnail Image'
                    : `Convert to ${format.toUpperCase()}`}
                </span>
              </button>
            )}
          </div>
        ) : (
          /* Download Result View */
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Conversion Ready!</h4>
                <p className="text-xs text-slate-300">
                  Your YouTube file has been transcoded into {downloadUrl.quality} {downloadUrl.format}.
                </p>
              </div>
            </div>

            {/* Video Details Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              {videoInfo?.thumbnail && (
                <div className="w-full sm:w-40 h-28 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-800">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 font-mono">
                  {downloadUrl.format} • {downloadUrl.quality}
                </span>
                <h3 className="text-base font-bold text-white mt-2 mb-1 truncate max-w-md">
                  {videoInfo?.title || 'YouTube Transcoded Video'}
                </h3>
                <p className="text-xs text-slate-400">
                  {downloadUrl.size && (<>Size: <strong className="text-slate-200">{downloadUrl.size}</strong> • </>)}100% Free
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={downloadUrl.url}
                  download={downloadUrl.filename}
                  rel="noopener"
                  className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-xl shadow-red-600/20 active:scale-[0.99] transition-all text-center"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>Download {downloadUrl.format}</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="py-4 px-6 rounded-2xl bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-750 transition-all active:scale-[0.99]"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Convert Another</span>
                </button>
              </div>

              {/* Extra bonus action: Grab thumbnail directly */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => handleExtractThumbnail('maxres')}
                  className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Also download Full 1080p Cover Thumbnail (.jpg)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
