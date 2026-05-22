FROM node:20-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y \
    chromium \
    libxshmfence-dev \
    libgbm-dev \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libasound2 \
    libxss1 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV DATA_DIR=/data
ENV PORT=3000

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
