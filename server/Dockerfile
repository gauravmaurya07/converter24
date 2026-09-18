FROM brainicism/bgutil-ytdlp-pot-provider:2.0.0-node

USER root
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip3 install --no-cache-dir --break-system-packages -U "yt-dlp[default]" "bgutil-ytdlp-pot-provider==2.0.0"

WORKDIR /app/converter
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./
COPY start.sh ./
RUN chmod +x start.sh && chown -R node:node /app/converter

ENV NODE_ENV=production
EXPOSE 10000
USER node
CMD ["/app/converter/start.sh"]
