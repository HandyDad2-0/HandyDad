# Build context for this file is the repo root (set in docker-compose.yml).
# The build stage needs two folders from outside frontend/, both imported
# directly (not through the API) at build time:
#   - data/seed-projects.json, via frontend/src/data/projects.js
#   - backend/materials-engine.js, via frontend/src/lib/materials.js

# --- build stage: turn the React app into static files ---
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN npm ci --prefix frontend

COPY frontend ./frontend
COPY data ./data
COPY backend/materials-engine.js ./backend/materials-engine.js

RUN npm run build --prefix frontend

# --- serve stage: nginx just hands out the built files ---
FROM nginx:alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
