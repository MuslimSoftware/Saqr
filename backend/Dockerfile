# syntax=docker/dockerfile:1.7
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    POETRY_VIRTUALENVS_CREATE=false

WORKDIR /app

# System deps
RUN echo "[backend] Installing system dependencies..." \
 && apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
    # Playwright browser dependencies (Chromium)
    libnss3 libnss3-tools libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libgtk-3-0 libpango-1.0-0 libasound2 libatspi2.0-0 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxtst6 libnspr4 xdg-utils wget \
    # Font packages (Debian Trixie compatible names)
    fonts-liberation fonts-unifont fonts-ubuntu \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency specs first for better caching
COPY requirements.txt /app/requirements.txt

RUN python --version && pip --version \
 && echo "[backend] Installing Python dependencies..." \
 && pip install --no-cache-dir -r /app/requirements.txt

# Copy app code
COPY app /app/app
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create data dirs (cookies, etc.)
RUN mkdir -p /app/data/cookies

# Install Playwright and Chromium for browser-use
RUN echo "[backend] Installing Playwright Chromium..." \
 && playwright install chromium

ENV HOST=0.0.0.0 \
    PORT=8000

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
# Add explicit log level and reload disabled (prod)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "info"]


