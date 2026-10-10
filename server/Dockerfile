FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY scripts scripts
RUN npm ci
COPY client client
COPY server server
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci --omit=dev --workspace @commerce/server --include-workspace-root=false
COPY --from=build /app/server/dist server/dist
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
