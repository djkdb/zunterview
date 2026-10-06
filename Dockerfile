# INTERVIEW//AI: one container serving the built web app and the API on $PORT.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev && npm install --no-save tsx

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8787 DATA_DIR=/app/var TRUST_PROXY=1
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/public/data ./public/data
COPY package.json ./
RUN mkdir -p /app/var && chown -R node:node /app/var
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:8787/api/health || exit 1
CMD ["node_modules/.bin/tsx", "server/index.ts"]
