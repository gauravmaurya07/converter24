/**
 * Service to parse YouTube URLs, extract video IDs, and retrieve video metadata.
 */
export const youtubeService = {
  /**
   * Extract 11-character YouTube video ID from various URL formats
   */
  extractVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    const cleanUrl = url.trim();

    // Standard watch, shorts, embed, youtu.be, music.youtube
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(regExp);

    if (match && match[1]) {
      return match[1];
    }

    // Direct 11-char ID check
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return cleanUrl;
    }

    return null;
  },

  /**
   * Get thumbnail URLs for a YouTube video
   */
  getThumbnailUrls(videoId) {
    if (!videoId) return null;
    return {
      maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      hq: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      mq: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    };
  },

  /**
   * Fetch video title and author using CORS-friendly oEmbed
   */
  async fetchMetadata(videoId) {
    if (!videoId) return null;

    const defaultData = {
      id: videoId,
      title: `YouTube Video (${videoId})`,
      author: 'YouTube Creator',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=videoId`,
    };

    try {
      const response = await fetch(
        `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.title) {
          return {
            id: videoId,
            title: data.title,
            author: data.author_name || 'YouTube Creator',
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            fallbackThumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }
      }
    } catch (err) {
      console.warn('Could not fetch oEmbed metadata, using fallback metadata:', err);
    }

    return defaultData;
  },
};

export default youtubeService;
