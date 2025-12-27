# CRL Pay - Quick Start Guide 🚀

## ✅ Setup Complete!

Your CRL Pay monorepo has been successfully configured with all 4 applications.

## 🎯 Start All Applications

Run this single command to start everything:

```bash
npm run dev
```

This will start:
- ✅ **Backend API** (NestJS) - http://localhost:3006
- ✅ **Admin Dashboard** (React) - http://localhost:3007
- ✅ **Merchant Dashboard** (React) - http://localhost:3008
- ✅ **Customer Webview** (Next.js) - http://localhost:3009

## 📱 Access Your Applications

### 1. Backend API & Swagger Documentation
**URL**: http://localhost:3006/api/v1/swagger-ui

- View all API endpoints
- Test API requests directly from browser
- See request/response schemas

### 2. Admin Dashboard
**URL**: http://localhost:3007

**Features**:
- Login page (use any email/password for demo)
- System overview dashboard
- Merchant approval workflow
- System analytics

**Demo Login**: Any email + any password (mock auth)

### 3. Merchant Dashboard
**URL**: http://localhost:3008

**Features**:
- Login page (use any email/password for demo)
- Revenue metrics dashboard
- Transaction monitoring
- Analytics view

**Demo Login**: Any email + any password (mock auth)

### 4. Customer Webview (Checkout Flow)
**URL**: http://localhost:3009

**Features**:
- Product summary page
- Buy Now Pay Later payment options
- Customer onboarding form
- BVN verification UI

**No login required** - Public checkout flow

## 🛠️ Run Individual Apps

If you want to run apps separately:

```bash
# Backend only
npm run dev:api

# Admin dashboard only
npm run dev:admin

# Merchant dashboard only
npm run dev:merchant

# Customer webview only
npm run dev:webview
```

## 📂 Project Structure

```
crl-pay/
├── src/                          # Backend NestJS API
│   ├── modules/                 # Feature modules (to be implemented)
│   ├── common/                  # ✅ Filters, interceptors, helpers
│   └── config/                  # ✅ Firebase, environment config
│
├── apps/                         # Frontend Applications
│   ├── admin-dashboard/         # ✅ Admin React app (Vite)
│   ├── merchant-dashboard/      # ✅ Merchant React app (Vite)
│   └── customer-webview/        # ✅ Customer Next.js app
│
├── shared/                       # Shared Code
│   └── types/                   # ✅ Shared TypeScript types
│
└── logs/                         # Application logs
```

## 🔥 What's Working Now

### ✅ Backend API
- Winston logging (console + file)
- Swagger API documentation
- Firebase Firestore connection
- Global exception handling
- Request validation
- CORS configuration

### ✅ Admin Dashboard
- React app with React Router
- Login page
- Dashboard with stats
- Merchant approval page with mock data
- TailwindCSS styling
- React Query for data fetching

### ✅ Merchant Dashboard
- React app with React Router
- Login page
- Dashboard with revenue metrics
- Transaction UI placeholder
- TailwindCSS styling

### ✅ Customer Webview
- Next.js app with SSR
- Product summary page
- Checkout form with BVN field
- Responsive design
- TailwindCSS styling

## 📝 Next Steps for Implementation

Follow the [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) to implement:

### Week 1-2: Core Backend Modules
1. **Merchant Module**
   ```bash
   nest g module modules/merchants
   nest g controller modules/merchants
   nest g service modules/merchants
   ```

2. **Customer Module**
   ```bash
   nest g module modules/customers
   nest g controller modules/customers
   nest g service modules/customers
   ```

### Week 3-4: Credit & Loans
3. **Credit Assessment Module**
4. **Loan Management Module**

### Week 5-6: Payments & Notifications
5. **Payment Processing Module**
6. **Notification Module**

### Week 7+: Advanced Features
7. **Analytics Module**
8. **Webhook Module**
9. **Default Management**

## 🔐 Authentication (To Be Implemented)

Currently using **mock authentication**. To implement real auth:

1. **Admin**: Create admin module with JWT strategy
2. **Merchant**: Update merchant login endpoint
3. **Connect Dashboards**: Update API calls to use real endpoints

## 📚 Documentation

- **[MONOREPO_SETUP.md](MONOREPO_SETUP.md)** - Detailed monorepo guide
- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Complete 11-week implementation roadmap
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Firestore collections schema
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Initial setup summary

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill processes on all ports
lsof -ti:3007 | xargs kill -9
lsof -ti:3008 | xargs kill -9
lsof -ti:3009 | xargs kill -9
lsof -ti:3006 | xargs kill -9

# Then restart
npm run dev
```

### Module Not Found Errors

```bash
# Clean install
rm -rf node_modules apps/*/node_modules
npm install
```

### Build Errors

```bash
# Rebuild all
npm run build:all
```

## 💡 Pro Tips

1. **Hot Reload**: All apps support hot reload - just save your files!
2. **Shared Types**: Update types in `shared/types/index.ts` - all apps will use them
3. **Parallel Development**: Run all 4 apps at once with `npm run dev`
4. **Logs**: Check `logs/app.log` and `logs/error.log` for backend errors
5. **Browser DevTools**: Open console to see React/Next.js errors

## 🚀 You're Ready to Build!

Start developing by running:

```bash
npm run dev
```

Then open:
- http://localhost:3007 (Admin Dashboard)
- http://localhost:3008 (Merchant Dashboard)
- http://localhost:3009 (Customer Webview)
- http://localhost:3006/api/v1/swagger-ui (API Docs)

Happy coding! 🎉
