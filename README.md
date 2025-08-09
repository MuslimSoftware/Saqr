# Saqr (صقر)

Saqr means "Desert Eagle" in Arabic, as this project was meant to be an assistant much like the desert eagle is when navigating the desert.

## Description
Saqr was made as an AI agent meant to empower me in my personal career, inspired by Manus. It made things like fetching the details for my task and doing simple DB queries a lot easier for me. This repo is a simplified version to demonstrate its capabilities.

## Features
- [DSPy](https://dspy.ai/) ReAct agent
- [browser-use](https://browser-use.com/) powered web search and scraping tool
- Query SQL DB tool ([Sakila sample DB](https://dev.mysql.com/doc/sakila/en/))
- Tool calls visible in a right-side panel with step-by-step screenshots captured during web scraping
- Reasoning shown inline in messages alongside tool calls

## Tech Stack
- Backend: Python 3.11, FastAPI, Uvicorn
- Data: MySQL (Sakila), Redis (caching/events)
- AI/Agents: DSPy, browser-use (Playwright/Chromium)
- Frontend: React Native / Expo (web export for prod)
- Ops: Docker, Docker Compose (dev and prod), Nginx (serve static web)

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Your Gemini API key for AI functionality

### Quick Start
1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Saqr
   ```

2. **Set up environment variables**
   ```bash
   cp .env.dev .env.local
   # Edit .env.local and add your API keys
   ```

3. **Start development environment**
   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Development vs Production
- **Development**: `docker compose -f docker-compose.dev.yml up`
  - Port mappings for local access
  - Local API URLs
  - Debug logging enabled
  - Separate dev databases
  
- **Production**: `docker compose up`
  - Production configuration unchanged
  - External API URLs
  - Optimized for deployment

### Debugging
- **Redis**: Available at `localhost:6379` (use redis-cli or GUI tools)
- **MySQL**: Available at `localhost:3306` (use any MySQL client)
  - Database: `sakila`
  - User: `root` 
  - Password: Set in your `.env.local`

### Environment Variables
Check `.env.dev` for all available configuration options. Key variables:
- `GEMINI_API_KEY`: Required for AI functionality
- `MYSQL_ROOT_PASSWORD`: Database password
- `JWT_SECRET_KEY`: Authentication secret
