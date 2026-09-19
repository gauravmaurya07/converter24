# converter24 media API
# Node 22 + FFmpeg + yt-dlp + BgUtils PO-token provider (built from the matching release).
#
# Everything is started by `node server.js` (it launches the PO-token provider itself,
# with absolute paths), so there is no shell script, no inherited ENTRYPOINT and no
# relative "build/main.js" path that can break when WORKDIR changes.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv ca-certificates git \
 && rm -rf /var/lib/apt/lists/*

# yt-dlp and its PO-token plugin live in an isolated venv.
# The newest yt-dlp is installed every time this layer is rebuilt
# (Render: Manual Deploy -> "Clear build cache & deploy").
RUN python3 -m venv /opt/venv \
 && /opt/venv/bin/pip install --no-cache-dir -U pip \
 && /opt/venv/bin/pip install --no-cache-dir -U "yt-dlp[default]" "bgutil-ytdlp-pot-provider==2.0.0"
ENV PATH="/opt/venv/bin:${PATH}"

# PO-token provider server - version must match the yt-dlp plugin above.
RUN git clone --depth 1 --branch 2.0.0 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil \
 && cd /opt/bgutil/server \
 && npm ci --no-audit --no-fund \
 && npx tsc \
 && (npm prune --omit=dev --no-audit --no-fund || true) \
 && npm cache clean --force \
 && rm -rf /opt/bgutil/.git

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY server.js ./

ENV NODE_ENV=production \
    POT_SERVER_DIR=/opt/bgutil/server \
    PORT=10000
EXPOSE 10000

USER node
CMD ["node", "server.js"]
