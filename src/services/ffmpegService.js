import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegService {
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.isLoaded = false;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Load FFmpeg WebAssembly core files
   */
  async load(onLog = null) {
    if (this.isLoaded) return true;
    if (this.isLoading) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        if (onLog) {
          this.ffmpeg.on('log', ({ message }) => onLog(message));
        }

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
        
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        this.isLoaded = true;
        this.isLoading = false;
        return true;
      } catch (err) {
        this.isLoading = false;
        this.loadPromise = null;
        console.error('Failed to load FFmpeg WebAssembly core:', err);
        throw new Error(`Failed to load WebAssembly engine: ${err.message || err}`);
      }
    })();

    return this.loadPromise;
  }

  /**
   * Format seconds to HH:MM:SS or MM:SS
   */
  formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Main convert file method
   */
  async convert({
    file,
    targetFormat = 'mp3',
    bitrate = '192',
    startTime = 0,
    endTime = null,
    volume = 100,
    resolution = 'original',
    onProgress = null,
    onLog = null,
  }) {
    await this.load(onLog);

    // Setup listeners
    if (onLog) {
      this.ffmpeg.on('log', ({ message }) => onLog(message));
    }
    if (onProgress) {
      this.ffmpeg.on('progress', ({ progress, time }) => {
        // progress is 0.0 to 1.0
        const percentage = Math.min(100, Math.max(0, Math.round(progress * 100)));
        onProgress({ percentage, time });
      });
    }

    const originalExt = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase() || 'mp4';
    const inputName = `input_${Date.now()}.${originalExt}`;
    const outputExt = targetFormat.toLowerCase();
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'converted_media';
    const outputName = `output_${Date.now()}.${outputExt}`;
    const downloadFilename = `${baseName}_converted.${outputExt}`;

    try {
      if (onLog) onLog(`Writing input file (${(file.size / (1024 * 1024)).toFixed(2)} MB) to virtual memory...`);
      await this.ffmpeg.writeFile(inputName, await fetchFile(file));

      // Build FFmpeg command arguments
      const args = ['-i', inputName];

      // Slicing / Trimming
      if (startTime > 0) {
        args.push('-ss', startTime.toString());
      }
      if (endTime && endTime > startTime) {
        args.push('-to', endTime.toString());
      }

      // Audio volume adjustment
      const audioFilters = [];
      if (volume && volume !== 100) {
        audioFilters.push(`volume=${(volume / 100).toFixed(2)}`);
      }

      let mimeType = 'audio/mpeg';

      // Format-specific configurations
      switch (targetFormat) {
        case 'mp3':
          args.push('-vn'); // no video
          args.push('-c:a', 'libmp3lame');
          args.push('-b:a', `${bitrate}k`);
          if (audioFilters.length > 0) {
            args.push('-filter:a', audioFilters.join(','));
          }
          mimeType = 'audio/mp3';
          break;

        case 'wav':
          args.push('-vn');
          args.push('-c:a', 'pcm_s16le');
          if (audioFilters.length > 0) {
            args.push('-filter:a', audioFilters.join(','));
          }
          mimeType = 'audio/wav';
          break;

        case 'aac':
          args.push('-vn');
          args.push('-c:a', 'aac');
          args.push('-b:a', `${bitrate}k`);
          if (audioFilters.length > 0) {
            args.push('-filter:a', audioFilters.join(','));
          }
          mimeType = 'audio/aac';
          break;

        case 'mp4': {
          const videoFilters = [];
          if (resolution === '1080p') videoFilters.push('scale=-2:1080');
          else if (resolution === '720p') videoFilters.push('scale=-2:720');
          else if (resolution === '480p') videoFilters.push('scale=-2:480');

          if (videoFilters.length > 0) {
            args.push('-vf', videoFilters.join(','));
          }

          args.push('-c:v', 'libx264');
          args.push('-preset', 'ultrafast');
          args.push('-c:a', 'aac');
          args.push('-b:a', `${bitrate}k`);
          if (audioFilters.length > 0) {
            args.push('-filter:a', audioFilters.join(','));
          }
          args.push('-movflags', '+faststart');
          mimeType = 'video/mp4';
          break;
        }

        default:
          args.push('-c:a', 'libmp3lame');
          args.push('-b:a', `${bitrate}k`);
          mimeType = 'audio/mp3';
          break;
      }

      args.push(outputName);

      if (onLog) onLog(`Executing FFmpeg command: ffmpeg ${args.join(' ')}`);
      
      const exitCode = await this.ffmpeg.exec(args);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with non-zero code ${exitCode}`);
      }

      if (onLog) onLog('Reading output file from virtual filesystem...');
      const data = await this.ffmpeg.readFile(outputName);
      
      // Create Object URL for download
      const blob = new Blob([data.buffer], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);

      // Clean up virtual filesystem to free memory
      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (cleanupErr) {
        console.warn('Virtual FS cleanup error:', cleanupErr);
      }

      return {
        url: blobUrl,
        blob,
        filename: downloadFilename,
        size: blob.size,
        format: targetFormat,
        mimeType,
      };
    } catch (err) {
      // Clean up in case of failure
      try {
        await this.ffmpeg.deleteFile(inputName);
        await this.ffmpeg.deleteFile(outputName);
      } catch (_) {}
      throw err;
    }
  }
}

export const ffmpegService = new FFmpegService();
export default ffmpegService;
