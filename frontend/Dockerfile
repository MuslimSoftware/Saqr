# syntax=docker/dockerfile:1.7
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps --silent

# Copy the rest of the app
COPY . .

# Build-time configuration
ARG FE_API_URL
ARG BRAND_NAME
ARG BRAND_SLUG
ARG APP_ENV=production

ENV FE_API_URL=${FE_API_URL} \
    BRAND_NAME=${BRAND_NAME} \
    BRAND_SLUG=${BRAND_SLUG} \
    APP_ENV=${APP_ENV} \
    CI=1

# Export static web build
RUN npx --yes expo export --platform web

# Install a simple static file server
RUN npm install -g serve

EXPOSE 3000

# Serve the static files
CMD ["serve", "-s", "dist", "-l", "3000"]


