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
| **1** | Auth + DB — Prisma schema, seed, login, session, authz helper ✅ |
| **2** | Core data — Customers, Suppliers, Leads (kanban) CRUD ✅ |
| **3** | Deals — TanStack table, approval workflow, live profit/commission ✅ |
| **4** | Commissions + Settings — generation on approval, share editor, users ✅ |
| **5** | Dashboard + Reports — KPIs, charts, Excel/PDF export, audit/activity ✅ |
| **6** | Polish & Deploy — dark mode, PWA icons, security, sample data ✅ |

---

## Deployment (Hostinger) — exact steps

> Tested on Hostinger shared hosting with the Node.js app manager and MySQL (MariaDB). The query engine used by `@prisma/client` works at runtime; the Prisma **migration** CLI may be blocked by the host's sandbox, so the schema is applied with the SQL file in `prisma/sql/` (see step 6b).

### 1. Push to GitHub
```bash
git push origin master
```

### 2. hPanel → create the MySQL database
**hPanel → Databases → MySQL Databases**
- Create a database (e.g. `uXXXXXXXXX_team`) and a user; note the username/password.
- Host is `localhost` when the app and DB are on the same account (it is, here).

### 3. hPanel → Add Website / Node.js App
**hPanel → Websites → Add Website → Node.js** (or **Advanced → Node.js Apps**)
- Point it at your domain (e.g. `team.horizon-sa.net`).

### 4. Import the Git repository
In the Node.js app → **Import Git Repository**
- Repository: `https://github.com/saleshorizonsa/team.git`
- Branch: `master`
- Build command: `npm run build`
- Start command: `npm start`
- Node version: **20+**

### 5. Set environment variables
In the Node.js app → **Environment Variables**, add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | `mysql://USER:PASS@localhost:3306/DBNAME` (URL-encode `@`→`%40` etc. in the password) |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
| `AUTH_SECRET` | same value as `NEXTAUTH_SECRET` |
| `NEXTAUTH_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `SEED_ADMIN_EMAIL` | `shareef6695@gmail.com` |
| `SEED_ADMIN_PASSWORD` | your chosen admin password |
| `SEED_SAMPLE_DATA` | `false` (set `true` once if you want demo data) |

### 6. Deploy
Click **Deploy**. `npm install` runs (which auto-runs `prisma generate`), then `npm run build`.

### 6b. Create the database tables
Via **hPanel → Databases → phpMyAdmin** (or SSH `mysql`), run the schema once:
```bash
mysql -u USER -p DBNAME < prisma/sql/schema.sql
```
(If your plan's Prisma CLI is not sandboxed, `npm run db:migrate` works instead.)

### 7. Seed the admin account
From the app's SSH terminal, in the deployed source directory:
```bash
npm run db:seed
```
This creates the admin from `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` and the default
commission rules. With `SEED_SAMPLE_DATA=true` it also inserts demo data.

### 8. Sign in
Open `https://your-domain.com` and sign in. HTTPS/SSL is provided by Hostinger;
`trustHost` and secure cookies are already configured for the reverse proxy.

---

## Business Rules

- **Currency**: SAR, formatted `SAR 1,234.56`
- **Profit**: `salesTotal − purchaseTotal − transportation` (VAT excluded)
- **VAT**: `salesTotal × vatRatePercent / 100` — stored for reporting only
- **Commission schemes**: POOLED (default) or PER_DEAL — configured by ADMIN
- **Approval flow**: DRAFT → SUBMITTED → APPROVED / REJECTED
- **Soft delete**: Records are never hard-deleted; `deletedAt` timestamp is set
- **Audit**: Every create / update / delete / approve / reject / payout / settings-change is logged with before+after JSON
