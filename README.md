# Saqr (صقر)

Saqr means "Desert Eagle" in Arabic, as this project was meant to be an assistant much like the desert eagle is when navigating the desert.

## Description
Saqr was made as an AI agent meant to empower me in my personal career, inspired by Manus. It made things like fetching the details for my task and doing simple DB queries a lot easier for me. This repo is a simplified version to demonstrate its capabilities.

## Features
- DSPy ReAct agent
- browser-use powered web search and scraping tool
- Query SQL DB tool (Sakila sample DB)
- Tool calls visible in a right-side panel with step-by-step screenshots captured during web scraping
- Reasoning shown inline in messages alongside tool calls

## Tech Stack
- Backend: Python 3.11, FastAPI, Uvicorn
- Data: MySQL (Sakila), Redis (caching/events)
- AI/Agents: DSPy, browser-use (Playwright/Chromium)
- Frontend: React Native / Expo (web export for prod)
- Ops: Docker, Docker Compose (dev and prod), Nginx (serve static web)