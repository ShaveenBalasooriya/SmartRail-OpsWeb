# Build the Operations web as static files, then serve them with nginx. The Node stage is never shipped.
FROM node:22-alpine AS build
WORKDIR /app

# Install first, with only the files that affect it, so a code change does not re-install.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_* values are read at build time, so they are build args. The OIDC pair defaults to the local
# Authentik blueprint when unset (src/features/auth/api/userManager.ts).
ARG VITE_OIDC_AUTHORITY
ARG VITE_OIDC_CLIENT_ID
ENV VITE_OIDC_AUTHORITY=$VITE_OIDC_AUTHORITY \
    VITE_OIDC_CLIENT_ID=$VITE_OIDC_CLIENT_ID
RUN npm run build

FROM nginx:1.27-alpine AS runtime

# The image's entrypoint renders /etc/nginx/templates/*.template into conf.d, filling ${API_UPSTREAM}.
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

ENV API_UPSTREAM=http://host.docker.internal:5080
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
