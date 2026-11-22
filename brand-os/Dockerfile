# Mannas Dungeons — single-container deploy.
# Everything (API + built frontend + uploads) runs in ONE Node process.
# Build:   docker build -t mannas-dungeons .
# Run:     docker run -p 8787:8787 -e JWT_SECRET=... mannas-dungeons
FROM node:20-slim

WORKDIR /app

# Install deps (uses package-lock for reproducibility)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source + build
COPY . .
RUN mkdir -p data && npm run seed && npm run build

EXPOSE 8787

# Start the single server (serves /api, /files, and the built app)
CMD ["node", "server/index.js"]
