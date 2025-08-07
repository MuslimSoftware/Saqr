# Use an official Python runtime as a parent image
# Choose a version that matches your development environment, e.g., 3.11 or 3.12
FROM python:3.11-slim

# Set environment variables to prevent Python from writing pyc files to disc
ENV PYTHONDONTWRITEBYTECODE 1
# Ensure Python output is sent straight to terminal without being buffered
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (like build-essential for hiredis if needed)
# Uncomment the line below if 'pip install hiredis' fails during the build
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# --- Install Playwright System Dependencies --- #
RUN apt-get update && apt-get install -y --no-install-recommends \
    # List of common dependencies for Playwright browsers on Debian-based systems
    libnss3 libnss3-tools libatk1.0-0 libatk-bridge2.0-0 libcups2 libdbus-1-3 \
    libdrm2 libgbm1 libgtk-3-0 libpango-1.0-0 libasound2 libatspi2.0-0 libx11-6 \
    libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxtst6 ca-certificates fonts-liberation libappindicator3-1 \
    libnspr4 xdg-utils wget \
    # Clean up apt cache
    && rm -rf /var/lib/apt/lists/*
# --- End Playwright Dependencies --- #

# Copy the requirements file into the container first
# This leverages Docker build caching
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser dependencies required by browser-use
# Only install Chromium as official Chrome is not supported on Linux Arm64
RUN playwright install --with-deps chromium

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app runs on
ENV BACKEND_PORT=${BACKEND_PORT:-8000}
EXPOSE ${BACKEND_PORT:-8000}

RUN mkdir -p /app/data/cookies

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "${BACKEND_PORT:-8000}"]
