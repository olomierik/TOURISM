# Production image for Railway.
#
# A Dockerfile rather than Railway's auto-detected build because:
#   * `npm ci` fails on Linux with this lockfile (see .github/workflows/ci.yml:
#     @tailwindcss/oxide-wasm32-wasi's bundled deps are only recorded for the
#     platform the lock was written on), so install with `npm install`.
#   * next.config.ts sets output: 'standalone', which `next start` does not
#     serve; the standalone server.js is what runs.

FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
RUN npm install --no-audit --no-fund

COPY . .

# NEXT_PUBLIC_* values are inlined into the bundle at build time, and the
# prebuild check (scripts/check-env.mjs) refuses a production build without the
# rest. Railway passes service variables to the build only when declared here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG SUPABASE_SECRET_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_ALLOW_INDEXING
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_ADSENSE_CLIENT_ID
ARG NEXT_PUBLIC_ADSENSE_SLOT_GUIDE
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG RESEND_API_KEY
ARG EMAIL_FROM
ARG RAILWAY_ENVIRONMENT_NAME

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build \
 && cp -r public .next/standalone/public \
 && cp -r .next/static .next/standalone/.next/static

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.next/standalone ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
