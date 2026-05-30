# Team Trading — Commission Tracker

A production web + mobile (PWA) reporting and commission-calculation tool for a 3-person trading business in Saudi Arabia. Provides full transparency: every deal, its profit, and how commission is split — visible to all team members in real time.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Roles & Permissions](#roles--permissions)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Build Phases](#build-phases)
- [Deployment (Hostinger)](#deployment-hostinger)
- [Business Rules](#business-rules)

---

## Overview

This is a **reporting + commission-calculation tool only** — not an accounting system (Zoho ERP handles accounting separately). Its purpose is transparency: all three users can always see what's happening across the business.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Database | MySQL on Hostinger via `mysql2` |
| ORM | Prisma (provider = `mysql`) |
| Auth | Auth.js v5 · Credentials · bcrypt · JWT |
| UI | Tailwind CSS + shadcn/ui + Recharts + TanStack Table |
| Forms | react-hook-form + zod |
| Export | SheetJS (xlsx) + print-to-PDF route |
| PWA | next-pwa (manifest + service worker) |

---

## Roles & Permissions

| Capability | ADMIN | USER |
|------------|-------|------|
| View all records | ✅ | ✅ |
| Create records | ✅ | ✅ |
| Edit/delete own DRAFT records | ✅ | ✅ |
| Edit/delete any record | ✅ | ❌ |
| Approve / reject deals | ✅ | ❌ |
| Configure commission scheme | ✅ | ❌ |
| Manage users | ✅ | ❌ |
| View audit log | Full | Read-only feed |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, etc.

# 3. Generate Prisma client
npm run db:generate

# 4. Push schema to database (dev) or run migrations (prod)
npm run db:push       # dev / first-time
npm run db:migrate    # production

# 5. Seed admin account
npm run db:seed

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Copy `.env.example` → `.env` and fill in the values. See the example file for descriptions.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | MySQL connection string |
| `NEXTAUTH_SECRET` | ✅ | Strong random string for JWT signing |
| `NEXTAUTH_URL` | ✅ | Full URL of the app |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public-facing app URL |
| `SEED_ADMIN_EMAIL` | Seed only | Admin email for initial seed |
| `SEED_ADMIN_PASSWORD` | Seed only | Admin password for initial seed |

---

## Project Structure

```
app/
  (auth)/login/          # Login page
  (dashboard)/           # Authenticated shell (sidebar + header)
    page.tsx             # Dashboard / KPI home
    leads/               # Lead management (Phase 2)
    deals/               # Deal management (Phase 2)
    commissions/         # Commission view (Phase 3)
    customers/           # Customer / Supplier CRU (Phase 2)
    settings/            # Admin settings (Phase 4)
    audit/               # Audit log (Phase 4)
  api/                   # API routes (Phase 1+)
  layout.tsx             # Root layout + PWA meta
components/
  layout/                # Sidebar, Header
  ui/                    # shadcn/ui primitives
  shared/                # Reusable app components
lib/
  auth.ts                # Auth.js config
  authz.ts               # Central authorization helper
  db.ts                  # Prisma singleton
  utils.ts               # cn(), formatSAR(), formatDate()
prisma/
  schema.prisma          # Full data model (Phase 1)
  seed.ts                # Admin seed script (Phase 1)
public/
  manifest.json          # PWA manifest
  icons/                 # App icons (192×192, 512×512 PNG)
```

---

## Build Phases

| Phase | Scope |
|-------|-------|
| **0** | Scaffold — structure, config, layout shell, PWA ✅ |
| **1** | Auth + DB — Prisma schema, seed, login, session, authz helper |
| **2** | Core data — Customers, Suppliers, Leads, Deals CRUD + approval flow |
| **3** | Commissions — calculation engine, payouts, dashboard KPIs + charts |
| **4** | Settings + Admin — commission rules editor, user management, audit log |
| **5** | Export + Polish — Excel/PDF export, PWA polish, empty states, perf |

---

## Deployment (Hostinger)

1. Push to GitHub; connect repo to Hostinger Cloud Node.js Web App.
2. Set all environment variables in the Hostinger control panel.
3. Framework is auto-detected as Next.js; build command: `npm run build`; start: `npm start`.
4. Database: use `localhost` if app and MySQL share the same Hostinger account; otherwise enable Remote MySQL and whitelist the server IP.
5. Ensure HTTPS is enforced (Hostinger provides free SSL).

---

## Business Rules

- **Currency**: SAR, formatted `SAR 1,234.56`
- **Profit**: `salesTotal − purchaseTotal − transportation` (VAT excluded)
- **VAT**: `salesTotal × vatRatePercent / 100` — stored for reporting only
- **Commission schemes**: POOLED (default) or PER_DEAL — configured by ADMIN
- **Approval flow**: DRAFT → SUBMITTED → APPROVED / REJECTED
- **Soft delete**: Records are never hard-deleted; `deletedAt` timestamp is set
- **Audit**: Every create / update / delete / approve / reject / payout / settings-change is logged with before+after JSON
