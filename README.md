# OptiFlow — Optical Lab Management Platform

A mobile-first web application for optical labs to manage spectacle job orders digitally. Replace WhatsApp and paper slips with a streamlined digital workflow.

## Features

- **Opticians** — Register shop, place orders with full prescription details, track job status live, download PDF invoices
- **Lab Technicians** — View assigned jobs, update status through each production stage
- **Lab Admin** — Full dashboard with all orders, billing, revenue tracking, staff management (add/remove technicians)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth + PostgreSQL + Storage)
- **PDF**: jsPDF + jsPDF-autotable
- **Deployment**: Vercel

---

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/optiflow.git
cd optiflow
npm install
```

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Also copy your **service_role key** (keep this secret!)

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run database schema

1. Go to your Supabase project → SQL Editor
2. Open `supabase/schema.sql`
3. Copy the entire contents and run it in the SQL Editor
4. This creates all tables, RLS policies, triggers, and storage buckets

### 5. Create your admin account

1. In Supabase → Authentication → Users → **Add user** (or use the Register page)
2. After creating, run this SQL to grant admin role:
```sql
UPDATE public.profiles 
SET role = 'admin', owner_name = 'Lab Admin', shop_name = 'Your Lab Name'
WHERE email = 'your-admin@email.com';
```

### 6. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. Then add environment variables:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Option B: Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add these environment variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy!

---

## User Roles

| Role | Access |
|------|--------|
| `optician` | Self-register, place orders, track own jobs, download invoices |
| `technician` | View & update assigned jobs (created by admin only) |
| `admin` | Full access: all orders, billing, staff management |

## Order Workflow

```
Order Received → Frame Scanning → Lens Edging → Lens Fitting → Quality Check → Ready for Delivery → Delivered
```

## Project Structure

```
src/
├── app/
│   ├── (auth)           login, register
│   ├── dashboard/       optician home
│   ├── orders/          order list, new order, order detail
│   ├── invoices/        invoice list
│   ├── profile/         shop profile settings
│   ├── technician/      technician job queue
│   ├── admin/           admin dashboard, orders, billing, staff
│   └── api/             API routes (create-user)
├── components/          AppShell, StatusBadge
├── lib/                 supabase client, pdf generator, utils
└── types/               TypeScript interfaces
supabase/
└── schema.sql           Full database schema with RLS
```

## Notifications

The app uses Supabase database notifications. When job status changes:
- Optician receives an in-app notification
- The notification bell in the nav shows unread count

## PDF Invoices

Generated client-side using jsPDF. Includes:
- Shop details and GST number
- Patient and prescription details
- Itemized pricing with GST breakdown
- Invoice number and payment status

---

## Support

For issues, open a GitHub issue or contact your lab administrator.
