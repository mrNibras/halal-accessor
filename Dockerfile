# ─── Build Stage ───
FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Build with env args (Vite will pick up VITE_* from the build context)
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN bun run build

# ─── Production Stage ───
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
