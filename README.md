# Saqr (صقر)

Saqr means "Desert Eagle" in Arabic, as this project was meant to be an assistant much like the desert eagle is when navigating the desert.

## Description
Saqr was made as an AI agent meant to empower me in my personal career, inspired by Manus. It made things like fetching the details for my task and doing simple DB queries a lot easier for me. This repo is a simplified version to demonstrate its capabilities.

## Capabilities
- Query SQL: Queries the Sakila sample DB
- Super Web Search: Scrapes websites to fulfill the user's request

Try it out: https://saqr.younesbenketira.com

https://github.com/user-attachments/assets/4d2d600e-4b80-47f1-837e-b119e63f500e

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
