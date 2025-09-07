# OAuth-only Auth Module (TypeScript + Express + MongoDB)

This repo implements OAuth (Google + GitHub) authentication without storing passwords or password hashes. It creates/updates user records with provider info and issues JWT tokens.

## Features

- Google OAuth & GitHub OAuth
- No password storage — user documents contain only provider info
- JWT tokens + HttpOnly cookie
- Protected `/api/v1/profile` endpoint
- TypeScript, dotenv, MongoDB (Mongoose)
- Central error handling, basic rate-limiting, helmet

## Setup

1. Copy files into a project folder.
2. `cp .env.example .env` and fill values (MONGO_URI, JWT_SECRET, OAuth client IDs/secrets).
3. Create OAuth app credentials:
   - Google: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (e.g. `http://localhost:4000/auth/google/callback`)
   - GitHub: set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
4. Install deps:
5. Run locally:
6. Endpoints:

- `GET /auth/google` -> starts Google OAuth flow
- `GET /auth/github` -> starts GitHub OAuth flow
- `GET /api/v1/profile` -> protected, requires JWT (cookie or Authorization header)

## Notes

- Cookies set are HttpOnly. For production, set `COOKIE_SECURE=true` and proper `COOKIE_DOMAIN`.
- Refresh tokens are not implemented in this scaffold; you can add refresh tokens (rotating) if you need long sessions.
- Because passwords are not stored, password-based login is intentionally omitted per requirements.
