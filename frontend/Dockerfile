# syntax=docker/dockerfile:1.7
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --legacy-peer-deps --silent

# Copy the rest of the app
COPY . .

# Build-time configuration
ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_BRAND_NAME
ARG EXPO_PUBLIC_BRAND_SLUG
ARG EXPO_PUBLIC_APP_ENV=production

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL} \
    EXPO_PUBLIC_BRAND_NAME=${EXPO_PUBLIC_BRAND_NAME} \
    EXPO_PUBLIC_BRAND_SLUG=${EXPO_PUBLIC_BRAND_SLUG} \
    EXPO_PUBLIC_APP_ENV=${EXPO_PUBLIC_APP_ENV} \
    CI=1

# Export static web build
RUN npx --yes expo export --platform web

# Install a simple static file server
RUN npm install -g serve

EXPOSE 3000

# Serve the static files
CMD ["serve", "-s", "dist", "-l", "3000"]


