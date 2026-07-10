# AGENTS.md

This file is used by AI coding agents (e.g., Claude, Cursor, Windsurf) to understand project conventions and structure when working with this codebase.

## Project Overview

PECT AI is an API gateway built on the New API framework, providing unified access to multiple AI model providers with billing, user management, and token tracking.

## Key Directories

- `controller/` - HTTP handler functions
- `model/` - Database models and queries
- `router/` - Route definitions
- `relay/` - AI model relay/adapter implementations
- `service/` - Business logic services
- `web/default/` - React frontend (Rsbuild)
- `web/classic/` - Legacy React frontend
- `common/` - Shared utilities and types
- `setting/` - Configuration and settings

## Build

```bash
# Frontend
cd web/default && npm run build

# Backend
go build -o one-api .
```

## Tech Stack

- Backend: Go (Gin, GORM, SQLite/PostgreSQL)
- Frontend: React 19, Rsbuild, Tailwind CSS, shadcn/ui
- Auth: Custom OAuth, Passkey, TOTP
- Payments: USDT TRC20, Stripe, Creem, Waffo
