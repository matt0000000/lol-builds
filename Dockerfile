# Build stage: needs dev dependencies to compile the SvelteKit app.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first so this layer is reused whenever only source changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune to production dependencies for the runtime stage. adapter-node's output
# still imports a handful of packages at run time, so node_modules is required.
RUN npm prune --omit=dev

# Runtime stage: just Node, the built server and its production dependencies.
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# The base image ships an unprivileged `node` user; use it rather than root.
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

# Bind to every interface so the port is reachable from outside the container.
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node", "build"]
