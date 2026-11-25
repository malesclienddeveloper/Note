FROM node:20-slim

# Chromium untuk scan
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ca-certificates fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

ENV CHROME_PATH=/usr/bin/chromium
ENV PORT=8080

# Scan sekali saat container start, lalu serve folder hasil via HTTP
CMD ["sh", "-c", "node bin/fankit-dl.mjs --scan-only --out /app/coc_assets --chrome /usr/bin/chromium && npx --yes serve -s /app/coc_assets -l ${PORT}"]