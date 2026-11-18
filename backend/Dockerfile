# Build context for this file is the repo root (set in docker-compose.yml),
# because backend/lib/*.js reads ../../data/seed-projects.json by relative
# path, so this image needs that data/ folder sitting next to backend/ too.
FROM node:20-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./backend/
RUN npm ci --prefix backend --omit=dev

COPY backend ./backend
COPY data ./data

WORKDIR /app/backend

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
