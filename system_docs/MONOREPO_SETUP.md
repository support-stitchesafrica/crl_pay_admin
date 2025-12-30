# CRL Pay Monorepo Setup

This project uses a **monorepo structure** with npm workspaces to manage multiple applications.

## Project Structure

```
crl-pay/
├── src/                          # Backend NestJS API
├── apps/
│   ├── admin-dashboard/         # Admin React SPA (Port 3007)
│   ├── merchant-dashboard/      # Merchant React SPA (Port 3008)
│   └── customer-webview/        # Customer Next.js App (Port 3009)
├── shared/
│   └── types/                   # Shared TypeScript types
└── package.json                  # Root workspace configuration
```

## Applications

| Application | Technology | Port | Purpose |
|------------|------------|------|---------|
| **Backend API** | NestJS + TypeScript | 3006 | Core business logic and REST API |
| **Admin Dashboard** | React + Vite + TailwindCSS | 3007 | Internal admin panel for managing merchants |
| **Merchant Dashboard** | React + Vite + TailwindCSS | 3008 | Merchant portal for monitoring transactions |
| **Customer Webview** | Next.js + React | 3009 | Customer-facing checkout flow |

## Installation

### Install all dependencies (backend + all frontend apps):

```bash
npm install
```

This will install dependencies for:
- The root project (NestJS backend)
- All workspace apps (admin, merchant, customer webview)
- Shared types package

## Running the Applications

### Option 1: Run All Apps Simultaneously (Recommended for Development)

```bash
npm run dev
```

This will start:
- ✅ Backend API at http://localhost:3006
- ✅ Admin Dashboard at http://localhost:3007
- ✅ Merchant Dashboard at http://localhost:3008
- ✅ Customer Webview at http://localhost:3009

### Option 2: Run Apps Individually

**Backend API:**
```bash
npm run dev:api
```

**Admin Dashboard:**
```bash
npm run dev:admin
```

**Merchant Dashboard:**
```bash
npm run dev:merchant
```

**Customer Webview:**
```bash
npm run dev:webview
```

## Access Points

After running `npm run dev`, access the applications at:

- **Swagger API Documentation**: http://localhost:3006/api/v1/swagger-ui
- **Admin Dashboard**: http://localhost:3007
  - Login with any email/password (mock auth for now)
- **Merchant Dashboard**: http://localhost:3008
  - Login with any email/password (mock auth for now)
- **Customer Webview**: http://localhost:3009
  - Public checkout flow (no login required)

## Building for Production

### Build all applications:

```bash
npm run build:all
```

### Build individually:

```bash
npm run build         # Backend only
npm run build:admin   # Admin dashboard only
npm run build:merchant # Merchant dashboard only
npm run build:webview # Customer webview only
```

## Development Workflow

1. **Start Development**: Run `npm run dev` to start all apps
2. **Make Changes**: Edit code in any app - changes will hot-reload automatically
3. **Shared Types**: Update types in `shared/types/index.ts` - all apps will pick them up
4. **Add Dependencies**:
   - For backend: `npm install package-name`
   - For admin: `npm install package-name --workspace=apps/admin-dashboard`
   - For merchant: `npm install package-name --workspace=apps/merchant-dashboard`
   - For webview: `npm install package-name --workspace=apps/customer-webview`

## Next Steps for Implementation

1. **Backend API**: Follow [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) to implement modules
2. **Connect Frontend to API**: Update API calls in dashboards to use real endpoints
3. **Authentication**: Implement proper JWT-based auth for admin and merchant dashboards
4. **Database**: Firestore collections are already configured (see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md))

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find and kill processes on ports 3007, 3008, 3009, 3006
lsof -ti:3007 | xargs kill -9
lsof -ti:3008 | xargs kill -9
lsof -ti:3009 | xargs kill -9
lsof -ti:3006 | xargs kill -9
```

### Clean Install

If you encounter dependency issues:

```bash
# Remove all node_modules
rm -rf node_modules apps/*/node_modules

# Reinstall
npm install
```

### Build Errors

If builds fail:

```bash
# Clean build cache
npm run build -- --clean

# Or rebuild workspaces
npm run build:all
```

## Features

### Current Features (Implemented)

✅ Monorepo structure with npm workspaces
✅ Backend NestJS API with:
  - Winston logging
  - Swagger documentation
  - Firebase integration
  - Global exception filters
  - Validation pipes

✅ Admin Dashboard with:
  - Login page
  - Dashboard overview
  - Merchant approval workflow

✅ Merchant Dashboard with:
  - Login page
  - Dashboard with revenue metrics
  - Transaction monitoring UI

✅ Customer Webview with:
  - Product summary page
  - Checkout form
  - Next.js SSR support

### Upcoming Features (See IMPLEMENTATION_GUIDE.md)

- Complete backend modules (merchants, customers, credit, loans, payments)
- Real API integration in dashboards
- JWT authentication
- Payment processing with Paystack
- Credit scoring engine
- Automated payment collection
- Analytics and reporting
- Webhook management

## Documentation

- **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** - Complete implementation roadmap with code examples
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Firestore database schema
- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Initial setup summary

## Technology Stack

### Backend
- NestJS
- TypeScript
- Firebase Admin SDK (Firestore)
- Winston (Logging)
- Passport + JWT (Authentication)
- Swagger (API Documentation)

### Frontend
- **Admin & Merchant Dashboards**: React, Vite, TailwindCSS, React Query, Recharts
- **Customer Webview**: Next.js, React, TailwindCSS

### Shared
- TypeScript for type safety across all apps
- Axios for API calls
- NPM Workspaces for monorepo management

---

**Happy Coding! 🚀**
