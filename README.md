# NEXPOS — Premium Cloud POS System

![Next.js](https://img.shields.io/badge/Next.js_15-black?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

A modern, premium point-of-sale and inventory management web application built with Next.js 15, Tailwind CSS, and Supabase.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | Next.js 14 (App Router)             |
| Styling   | Tailwind CSS 3 + custom design system |
| UI        | Custom components (shadcn/ui inspired) |
| Icons     | Lucide React                        |
| Charts    | Recharts                            |
| State     | React hooks + Zustand (ready)       |
| Backend   | Supabase (PostgreSQL + Auth)        |
| Hosting   | Vercel                              |

---

## Quick Start (Local Development)

### 1. Install dependencies

```bash
cd "POS INVENTORY"
npm install
```

### 2. Configure environment (optional for demo mode)

```bash
cp .env.local.example .env.local
```

The app works in **demo mode** without Supabase — all data is mocked locally.

To connect to Supabase, edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Login

Use the pre-filled demo credentials:
- **Email:** demo@nexpos.app
- **Password:** demo1234

Click **Sign In** to access the dashboard.

---

## Pages

| Route                    | Description                        |
|--------------------------|------------------------------------|
| `/login`                 | Login page (SaaS style)            |
| `/signup`                | Two-step signup wizard             |
| `/dashboard`             | Main dashboard with KPIs + charts  |
| `/dashboard/pos`         | **POS Terminal** (priority screen) |
| `/dashboard/products`    | Product catalog management         |
| `/dashboard/inventory`   | Stock levels & reorder alerts      |
| `/dashboard/customers`   | Customer directory                 |
| `/dashboard/reports`     | Revenue analytics & reports        |
| `/dashboard/settings`    | Business & system configuration    |

---

## POS Screen Features

The POS terminal (`/dashboard/pos`) is the core screen:

- **Product grid** — large touch-friendly cards with category filter
- **Cart panel** — real-time order builder with quantity controls
- **Discount system** — 0%, 5%, 10%, 15%, 20% presets
- **Tax calculation** — automatic 8% tax
- **Payment modal** — Card / Cash (with numpad + change calc) / QR
- **Order confirmation** — animated success state
- **Barcode search** — search by product name or SKU

---

## Design System

### Colors
- **Primary:** Indigo `#6366F1` → Violet `#8B5CF6` (gradient)
- **Success:** Emerald `#10B981`
- **Warning:** Amber `#F59E0B`
- **Danger:** Rose `#EF4444`
- **Background:** `#F8F9FC`
- **Sidebar:** `#0F172A`

### Typography
- **Font:** Inter (Google Fonts via Next.js)
- **Sizes:** 11px–48px scale

### Shadows
- `shadow-card` — subtle card lift
- `shadow-card-md` — hover elevation
- `shadow-brand` — indigo glow
- `shadow-brand-lg` — strong brand glow

---

## Supabase Schema (Coming Soon)

When connecting to Supabase, create these tables:

- `products` — product catalog
- `categories` — product categories
- `orders` — sales orders
- `order_items` — line items per order
- `customers` — customer directory
- `inventory_log` — stock movement history

---

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Project Structure

```
POS INVENTORY/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/page.tsx       # Signup wizard
│   ├── dashboard/
│   │   ├── layout.tsx            # Sidebar layout
│   │   ├── page.tsx              # Dashboard
│   │   ├── pos/page.tsx          # POS Terminal ★
│   │   ├── products/page.tsx     # Products
│   │   ├── inventory/page.tsx    # Inventory
│   │   ├── customers/page.tsx    # Customers
│   │   ├── reports/page.tsx      # Reports
│   │   └── settings/page.tsx     # Settings
│   ├── globals.css               # Design system CSS
│   └── layout.tsx                # Root layout
├── components/
│   ├── ui/                       # UI components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── input.tsx
│   │   └── card.tsx
│   └── layout/
│       ├── sidebar.tsx
│       └── header.tsx
├── lib/
│   ├── utils.ts                  # Utility functions
│   ├── types.ts                  # TypeScript types
│   ├── mock-data.ts              # Demo data
│   └── supabase.ts               # Supabase client
├── tailwind.config.ts            # Design tokens
└── package.json
```

---

Built with care for the modern retail experience.
