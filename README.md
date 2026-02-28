# 🏠 RentifyPro

A full-stack rental property management platform built with **Next.js** (frontend) and **Node.js/Express** (backend). RentifyPro enables landlords, tenants, property managers, and admins to manage properties, lease agreements, payments, maintenance requests, disputes, and real-time messaging — all in one place.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Stripe Webhook Setup (Local Dev)](#-stripe-webhook-setup-local-dev)
- [API Documentation](#-api-documentation)
- [User Roles](#-user-roles)

---

## ✨ Features

- 🔐 JWT authentication with access/refresh tokens + HttpOnly cookies
- 🔑 Google OAuth 2.0 login (Passport.js)
- ✉️ Email verification, password reset (Nodemailer)
- 📱 SMS notifications (Twilio)
- 🏡 Property listings, browsing, and applications
- 📄 Lease agreement generation with PDF export
- 💳 Stripe payment processing with webhook support
- 🔧 Maintenance request tracking
- ⚖️ Dispute management
- 💬 Real-time messaging (Socket.io)
- 🔔 Background notification queue (BullMQ + Redis)
- ☁️ Image uploads via Cloudinary
- 📆 Automated rent scheduler (cron)
- 🔥 Firebase push notifications
- 🛡️ Rate limiting on auth routes
- 📖 Swagger API docs
- 👑 Admin panel with audit logs, user management, and templates
- 🔑 2FA setup and phone verification

---

## 🛠 Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Primary database |
| Redis (ioredis) | Queue store & caching |
| BullMQ | Background job queue |
| Socket.io | Real-time messaging |
| Passport.js | Google OAuth strategy |
| JWT | Access & refresh token auth |
| Stripe | Payment processing |
| Nodemailer | Email service |
| Twilio | SMS notifications |
| Cloudinary + Multer | Image storage & upload |
| Firebase Admin SDK | Push notifications |
| PDFKit | PDF generation |
| Swagger (swagger-jsdoc + swagger-ui-express) | API documentation |
| node-cron | Scheduled rent reminders |

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | React framework |
| Axios | HTTP client with interceptors |
| Google Fonts (Geist) | Typography |

---

## 📁 Project Structure

```
rentifypro/
├── server/                       # Express backend
│   ├── config/
│   │   ├── db.js                 # MongoDB connection
│   │   ├── redis.js              # Redis/ioredis connection
│   │   ├── passport.js           # Google OAuth strategy
│   │   ├── cloudinary.js         # Cloudinary + Multer config
│   │   └── swagger.js            # Swagger spec config
│   ├── controllers/              # Route handler logic
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── propertyController.js
│   │   ├── listingController.js
│   │   ├── agreementController.js
│   │   ├── applicationController.js
│   │   ├── paymentController.js  # Stripe + webhook handler
│   │   ├── maintenanceController.js
│   │   ├── messageController.js
│   │   ├── disputeController.js
│   │   └── adminController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── rateLimiter.js        # Express rate limiter
│   ├── models/                   # Mongoose schemas
│   │   ├── User.js
│   │   ├── Property.js
│   │   ├── Agreement.js
│   │   ├── Application.js
│   │   ├── Payment.js
│   │   ├── MaintenanceRequest.js
│   │   ├── Message.js
│   │   ├── Dispute.js
│   │   └── Clause.js
│   ├── queues/
│   │   └── notificationQueue.js  # BullMQ queue definition
│   ├── routes/                   # Express routers
│   ├── schedulers/
│   │   └── rentScheduler.js      # Cron rent reminders
│   ├── utils/
│   │   ├── emailService.js       # Nodemailer helper
│   │   ├── smsService.js         # Twilio helper
│   │   ├── firebaseService.js    # Firebase Admin helper
│   │   ├── generateToken.js      # JWT utility
│   │   └── pdfGenerator.js       # PDFKit helper
│   ├── workers/
│   │   └── notificationWorker.js # BullMQ worker
│   └── server.js                 # Entry point
│
└── src/                          # Next.js frontend
    └── src/
        ├── app/
        │   ├── (auth)/           # Login, register, verify, reset
        │   ├── auth/google/      # Google OAuth flow
        │   ├── browse/           # Public property listings
        │   ├── dashboard/        # Protected dashboard pages
        │   │   ├── admin/        # Admin panel
        │   │   ├── landlord/     # Landlord views
        │   │   ├── pm/           # Property manager views
        │   │   ├── agreements/
        │   │   ├── applications/
        │   │   ├── disputes/
        │   │   ├── maintenance/
        │   │   ├── messages/
        │   │   ├── payments/
        │   │   ├── properties/
        │   │   ├── my-lease/
        │   │   └── profile/
        │   ├── super-login/
        │   ├── layout.js
        │   └── page.js
        ├── components/
        │   ├── Navbar.js
        │   └── Footer.js
        └── utils/
            └── api.js            # Axios instance with interceptors
```

---

## ✅ Prerequisites

Make sure you have the following installed before getting started:

- **Node.js** v18 or later — [nodejs.org](https://nodejs.org)
- **npm** v9 or later (comes with Node.js)
- **MongoDB** — Local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) (free tier)
- **Redis** — Local instance or [Redis Cloud](https://redis.com/try-free/) (free tier)
- **Stripe CLI** — For local webhook forwarding ([download here](https://stripe.com/docs/stripe-cli))
- A **Stripe account** — [stripe.com](https://stripe.com)
- A **Cloudinary account** — [cloudinary.com](https://cloudinary.com)
- A **Google Cloud** project with OAuth 2.0 credentials (for Google login)
- *(Optional)* A **Twilio** account for SMS
- *(Optional)* A **Firebase** project for push notifications

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/rentifypro.git
cd rentifypro
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

**Backend `npm install` installs:**

```
express            - Web framework
mongoose           - MongoDB ODM
dotenv             - Environment variables
cors               - Cross-origin resource sharing
cookie-parser      - Parse HTTP cookies
jsonwebtoken       - JWT access/refresh tokens
bcryptjs           - Password hashing
passport           - Authentication middleware
passport-google-oauth20 - Google OAuth 2.0 strategy
socket.io          - Real-time WebSocket server
stripe             - Stripe payment SDK
nodemailer         - Email sending
twilio             - SMS sending
ioredis            - Redis client
bullmq             - Background job queue
cloudinary         - Cloudinary SDK
multer             - File upload middleware
multer-storage-cloudinary - Cloudinary multer storage
pdfkit             - PDF generation
firebase-admin     - Firebase push notifications
swagger-jsdoc      - Swagger spec from JSDoc comments
swagger-ui-express - Swagger UI middleware
node-cron          - Cron job scheduler
express-rate-limit - Rate limiting
```

### 3. Install frontend dependencies

```bash
cd ../src
npm install
```

**Frontend `npm install` installs:**

```
next       - Next.js framework (App Router)
react      - React library
react-dom  - React DOM
axios      - HTTP client with interceptors
```

---

## 🔐 Environment Variables

### Backend — `server/.env`

Create a `.env` file inside the `server/` directory:

```env
# ─── Server ───────────────────────────────────────
PORT=5000
CLIENT_URL=http://localhost:3000
NODE_ENV=development

# ─── MongoDB ──────────────────────────────────────
MONGO_URI=mongodb://127.0.0.1:27017/rentifypro
# Or use Atlas:
# MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/rentifypro

# ─── JWT ──────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ─── Redis ────────────────────────────────────────
REDIS_URL=redis://127.0.0.1:6379
# For TLS (cloud Redis):
# REDIS_URL=rediss://<user>:<password>@your-redis-host:6380

# ─── Google OAuth ─────────────────────────────────
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# ─── Stripe ───────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# Get the webhook secret from `stripe listen` output (see below)

# ─── Cloudinary ───────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ─── Email (Nodemailer) ───────────────────────────
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
# Use a Gmail App Password, not your real password

# ─── Twilio SMS (optional) ────────────────────────
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ─── Firebase (optional) ──────────────────────────
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
```

### Frontend — `src/.env.local`

Create a `.env.local` file inside the `src/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 Running the App

### Start Redis (if running locally)

```bash
redis-server
```

### Start the backend server

```bash
cd server
npm run dev
# or
node server.js
```

The backend will start at **http://localhost:5000**

### Start the frontend

```bash
cd src
npm run dev
```

The frontend will start at **http://localhost:3000**

---

## 💳 Stripe Webhook Setup (Local Dev)

To test Stripe payments locally, you need to forward Stripe webhook events to your running backend using the **Stripe CLI**.

### Step 1 — Download the Stripe CLI

Download the Stripe CLI executable from:
👉 [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)

Place the `stripe.exe` (Windows) or `stripe` (Mac/Linux) binary somewhere on your machine.

### Step 2 — Run the listener

> ⚠️ **Run this command in the same directory as your `stripe.exe` file.**

**Windows (Command Prompt or PowerShell):**
```bash
.\stripe.exe listen --forward-to localhost:5000/api/webhooks
```

**Mac / Linux:**
```bash
./stripe listen --forward-to localhost:5000/api/webhooks
```

### Step 3 — Copy the webhook secret

When the listener starts, you'll see output like this:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (^C to quit)
```

Copy that `whsec_...` value and paste it into your `server/.env` as:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then restart the backend server. Stripe payment events (successful charges, failures, etc.) will now be received at `POST /api/webhooks` during local development.

> **Production note:** In production, set your Stripe dashboard webhook URL to `https://yourdomain.com/api/payments/webhook`. Both paths are registered on the server.

---

## 📖 API Documentation

Swagger UI is available once the backend is running:

```
http://localhost:5000/api-docs
```

### Available API Routes

| Prefix | Description |
|---|---|
| `POST /api/auth` | Register, login, refresh, logout, Google OAuth |
| `GET/PUT /api/users` | User profile management |
| `GET/POST /api/properties` | Property CRUD |
| `GET /api/listings` | Public property listings |
| `POST /api/applications` | Rental applications |
| `GET/POST /api/agreements` | Lease agreement management |
| `POST /api/payments` | Stripe checkout sessions |
| `POST /api/webhooks` | Stripe webhook receiver (local dev) |
| `POST /api/payments/webhook` | Stripe webhook receiver (production) |
| `GET/POST /api/maintenance` | Maintenance requests |
| `GET/POST /api/messages` | Messaging between users |
| `GET/POST /api/disputes` | Dispute management |
| `POST /api/upload` | Image upload (Cloudinary) |
| `GET /api/admin` | Admin panel endpoints |
| `GET /api/health` | Health check |

---

## 👥 User Roles

| Role | Access |
|---|---|
| `tenant` | Browse listings, apply, pay rent, submit maintenance, message, view lease |
| `landlord` | Manage properties, review applications, create agreements, view payments |
| `property_manager` | Manage assigned properties, tenants, and maintenance |
| `law_reviewer` | Review and validate lease agreement clauses |
| `admin` | Full access — user management, audit logs, templates, dispute resolution |

---

## 🔌 Real-Time Events (Socket.io)

The server runs Socket.io on the same HTTP port (`5000`). Users are registered by `userId` on connect and removed on disconnect. This powers real-time direct messaging between landlords and tenants.

Connect from the frontend:

```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:5000', { withCredentials: true });
socket.emit('register', userId);
```

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.
