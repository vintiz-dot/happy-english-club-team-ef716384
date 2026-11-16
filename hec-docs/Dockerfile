# HEC Docs: PDF rendering service.
# Pinned: Playwright 1.58.2 ships Chromium 145 (build 1208); the image tag,
# package-lock.json and the bundled fonts make renders reproducible.
FROM node:24.11.1-bookworm-slim AS node24

FROM mcr.microsoft.com/playwright:v1.58.2-noble AS base
# The Playwright image brings its own Node LTS; the service runs its .ts
# sources directly, which needs Node 24's type stripping. Take Node 24 from
# the official image and keep Playwright's pinned browser.
COPY --from=node24 /usr/local/bin/node /usr/local/bin/node
COPY --from=node24 /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm  && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx  && node --version
ENV NODE_ENV=production \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    HEC_DOCS_HOST=0.0.0.0 \
    HEC_DOCS_PORT=8787
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM base AS test
COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts
COPY . .
RUN npm run lint && npm run typecheck && npm run test:unit && npm run test:snapshot

FROM base AS runtime
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY bin ./bin
COPY src ./src
COPY components ./components
COPY templates ./templates
COPY tenants ./tenants
COPY tokens ./tokens
COPY schemas ./schemas
COPY fonts ./fonts
# Chromium refuses its sandbox as root; run as the image's unprivileged user.
USER pwuser
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=20s --start-period=20s CMD node -e "fetch('http://127.0.0.1:'+(process.env.HEC_DOCS_PORT||8787)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.ts"]
