# 🎓 Circonomy Campus OS

> The complete circular economy platform for student communities — buy, sell, borrow, hire, chat, and pay. All in one place.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?logo=supabase)](https://supabase.com)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple?logo=clerk)](https://clerk.com)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-blue)](https://razorpay.com)

---

## ✨ Features

| Feature | Status |
|---------|--------|
| 🛍️ Buy & Sell Marketplace | ✅ Complete |
| 🤝 Peer Borrow & Lend | ✅ Complete |
| 💼 Micro Gigs / Services | ✅ Complete |
| 💬 Real-Time 1:1 Chat | ✅ Complete |
| 🔔 Live Notifications | ✅ Complete |
| 💳 Razorpay Payments + Verification | ✅ Complete |
| ⭐ Reviews & Trust Score | ✅ Complete |
| 👤 Edit Profile | ✅ Complete |
| 📱 Mobile-First Responsive | ✅ Complete |
| 🌙 Dark Mode | ✅ Complete |

---

## 🚀 Deploy in 15 Minutes

### 1. Clone & Install
```bash
git clone https://github.com/your-org/campus-os
cd campus-os
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
```

### 2. Set Up Supabase
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `schema.sql`
3. Go to **Database → Replication** and enable replication for:
   - `messages` table
   - `notifications` table
4. Copy your **Project URL**, **anon key**, and **service_role key** into `.env.local`

### 3. Set Up Clerk
1. Create an app at [clerk.com](https://clerk.com)
2. Copy your **Publishable Key** and **Secret Key** into `.env.local`
3. In Clerk Dashboard → **Webhooks** → Add endpoint:
   - URL: `https://your-domain.vercel.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`

### 4. Set Up Razorpay
1. Create account at [razorpay.com](https://razorpay.com)
2. Go to **Settings → API Keys** → Generate Test Key
3. Copy **Key ID** and **Key Secret** into `.env.local`

### 5. Deploy to Vercel
```bash
npx vercel --prod
# Or connect GitHub repo in Vercel dashboard
# Add all env vars in Vercel → Project → Settings → Environment Variables
```

---

## 🗄️ Database Schema

```
users          — Student profiles synced from Clerk
listings       — Marketplace items for sale
borrow_requests— Item lending requests  
gigs           — Student services/skills
orders         — Gig hire transactions with payment tracking
messages       — Real-time 1:1 chat messages
notifications  — In-app notification feed
reviews        — Post-transaction ratings
```

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── (auth)/           # Sign-in / Sign-up pages (Clerk)
│   ├── (dashboard)/      # Protected app pages
│   │   ├── home/         # Feed + quick actions
│   │   ├── marketplace/  # Buy & sell listings
│   │   ├── borrow/       # Peer lending hub
│   │   ├── gigs/         # Student services marketplace
│   │   ├── chat/         # Real-time messaging (Supabase Realtime)
│   │   ├── activity/     # Transaction history
│   │   └── profile/      # User profile + trust score
│   └── api/
│       ├── listings/     # CRUD for marketplace listings
│       ├── borrow/       # Borrow request management
│       ├── gigs/         # Gig listing + hiring
│       ├── orders/       # Order status management
│       ├── messages/     # Chat API + conversations
│       ├── payments/     # Razorpay order creation + verification
│       ├── notifications/# Notification read/unread
│       ├── reviews/      # Rating & review system
│       └── profile/      # User profile CRUD
├── components/
│   ├── shared/           # Sidebar, TopBar, MobileNav, Notifications
│   └── ui/               # Radix UI components
└── lib/
    └── supabase/         # DB client (client, server, admin)
```

---

## 💳 Payment Flow

```
User clicks "Hire" on a Gig
        ↓
POST /api/orders → Create order in DB
        ↓
POST /api/payments → Create Razorpay order (server-side)
        ↓
Frontend opens Razorpay Checkout modal
        ↓
User completes payment
        ↓
POST /api/payments/verify → HMAC-SHA256 signature check
        ↓
order.payment_status = 'paid', order.status = 'accepted'
        ↓
Seller gets push notification
```

---

## 💬 Real-Time Chat Flow

```
User opens /chat
        ↓
GET /api/messages/conversations → Load conversation list
        ↓
User selects conversation
        ↓
GET /api/messages?other_user_id=xxx → Load message history
        ↓
Supabase Realtime subscription on messages table
        ↓
New messages appear instantly without refresh
        ↓
POST /api/messages → Send message + notify receiver
```

---

## 🔐 Security

- All API routes protected with Clerk `auth()`
- Supabase accessed only via Service Role key (server-side only)
- Razorpay payments verified with HMAC-SHA256 signature (no fake payments possible)
- RLS enabled on all Supabase tables
- Input validation on all POST/PATCH routes

---

## 🛠️ Local Development

```bash
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run type-check   # TypeScript check
```

---

## 🤝 Contributing

This is a hackathon project. PRs welcome for:
- Image upload (Supabase Storage)
- Push notifications (OneSignal/FCM)
- Campus verification via college email domain
