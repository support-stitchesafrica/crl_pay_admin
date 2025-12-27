# 🚀 START HERE - CRL Pay Monorepo

## Welcome to CRL Pay BNPL System!

This is a **monorepo** containing 4 applications that work together to provide a complete Buy Now Pay Later (BNPL) solution.

## ⚡ Quick Start (2 Minutes)

### Step 1: Install Dependencies (if not already done)

```bash
npm install
```

### Step 2: Start All Applications

```bash
npm run dev
```

### Step 3: Access Your Applications

Open these URLs in your browser:

1. **Admin Dashboard**: http://localhost:3007
   - Login: Use any email + any password
   - Approve merchants, view system analytics

2. **Merchant Dashboard**: http://localhost:3008
   - Login: Use any email + any password
   - Monitor transactions, view revenue

3. **Customer Webview**: http://localhost:3009
   - No login needed
   - See the customer checkout experience

4. **API Documentation**: http://localhost:3006/api/v1/swagger-ui
   - Explore all API endpoints
   - Test API calls directly

## 📂 What's in This Repo?

```
✅ Backend API (NestJS) - Port 3006
✅ Admin Dashboard (React) - Port 3007
✅ Merchant Dashboard (React) - Port 3008
✅ Customer Webview (Next.js) - Port 3009
✅ Shared Types Package
```

## 🎯 What Works Right Now?

### Backend API ✅
- Winston logging
- Swagger documentation
- Firebase connection
- Exception handling
- CORS configuration

### Admin Dashboard ✅
- Login page
- System overview with stats
- Merchant approval workflow
- Mock data for testing

### Merchant Dashboard ✅
- Login page
- Revenue metrics dashboard
- Transaction monitoring UI
- Mock data for testing

### Customer Webview ✅
- Product summary page
- Payment plan options
- Checkout form with BVN field
- Responsive design

## 🛠️ Development Commands

### Run All Apps at Once
```bash
npm run dev
```

### Run Individual Apps
```bash
npm run dev:api         # Backend only (Port 3006)
npm run dev:admin       # Admin dashboard only (Port 3007)
npm run dev:merchant    # Merchant dashboard only (Port 3008)
npm run dev:webview     # Customer webview only (Port 3009)
```

### Build for Production
```bash
npm run build:all       # Build everything
npm run build           # Build backend only
npm run build:admin     # Build admin only
npm run build:merchant  # Build merchant only
npm run build:webview   # Build webview only
```

## 📖 Documentation Guide

Start with these docs in order:

1. **[QUICK_START.md](QUICK_START.md)** ⭐ Read this first!
   - How to run the apps
   - What each app does
   - Troubleshooting tips

2. **[MONOREPO_SETUP.md](MONOREPO_SETUP.md)**
   - Detailed monorepo architecture
   - Workspace configuration
   - Development workflow

3. **[IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md)** 📚 Complete roadmap!
   - 11-week implementation plan
   - Code examples for all modules
   - Admin & Merchant dashboard implementation
   - Customer webview implementation
   - Testing strategies

4. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)**
   - Firestore collections (10 total)
   - All prefixed with `crl_`
   - Field descriptions
   - Indexes and security rules

5. **[MONOREPO_IMPLEMENTATION_SUMMARY.md](MONOREPO_IMPLEMENTATION_SUMMARY.md)**
   - What has been completed
   - Current state summary
   - Next steps

## ⚠️ Important Notes

### Mock Authentication
Currently, all dashboards use **mock authentication**:
- Login with **any email** + **any password**
- Real JWT authentication needs to be implemented

### Mock Data
Dashboards show **demo/mock data**:
- Merchant approvals list
- Revenue metrics
- Transaction stats

To connect to real data, follow the **IMPLEMENTATION_GUIDE.md**.

### Environment Variables
The `.env` file is already configured with Firebase credentials from your Stitches Africa project. All CRL Pay data will be stored in collections prefixed with `crl_`.

## 🐛 Common Issues

### "Port already in use"
```bash
# Kill processes on ports
lsof -ti:3007 | xargs kill -9
lsof -ti:3008 | xargs kill -9
lsof -ti:3009 | xargs kill -9
lsof -ti:3006 | xargs kill -9

# Then restart
npm run dev
```

### Dependencies not found
```bash
# Clean install
rm -rf node_modules apps/*/node_modules
npm install
```

### Apps not hot reloading
- Make sure you're using `npm run dev` (not `npm start`)
- Check that file changes are being saved
- Try restarting the dev servers

## 🎓 Learning Path

### For Backend Development
1. Read Phase 1-2 in IMPLEMENTATION_GUIDE.md
2. Implement Merchant Module
3. Implement Customer Module
4. Connect to Firebase Firestore

### For Frontend Development
1. Read Admin Dashboard section in IMPLEMENTATION_GUIDE.md
2. Update mock data to real API calls
3. Implement authentication with JWT
4. Add more pages as needed

### For Full-Stack Development
1. Start with backend module (e.g., Merchants)
2. Create API endpoints
3. Update frontend to call real endpoints
4. Test end-to-end flow

## 🚀 Next Steps

### Immediate (This Week)
1. ✅ Run `npm run dev` and explore all 4 apps
2. ✅ Read through IMPLEMENTATION_GUIDE.md
3. ⏳ Decide which module to implement first (recommend: Merchants)

### Short-Term (Week 1-2)
4. ⏳ Implement Merchant Module (backend)
5. ⏳ Connect Admin Dashboard to real merchant API
6. ⏳ Implement Customer Module (backend)

### Medium-Term (Week 3-6)
7. ⏳ Implement Credit Assessment Engine
8. ⏳ Implement Loan Module
9. ⏳ Implement Payment Processing with Paystack
10. ⏳ Connect Customer Webview to real checkout API

### Long-Term (Week 7-11)
11. ⏳ Analytics and reporting
12. ⏳ Default management
13. ⏳ Comprehensive testing
14. ⏳ Production deployment

## 💡 Pro Tips

1. **Always use `npm run dev`** - Starts all 4 apps at once with hot reload
2. **Check logs/** directory for backend errors
3. **Use browser DevTools** to debug frontend issues
4. **Update shared types** in `shared/types/index.ts` - all apps will use them
5. **Follow the implementation guide** - It has complete code examples!

## 🤝 Need Help?

Check these resources:
- **IMPLEMENTATION_GUIDE.md** - Step-by-step instructions
- **QUICK_START.md** - Troubleshooting guide
- Swagger UI at http://localhost:3006/api/v1/swagger-ui

## ✅ Checklist Before Starting

- [ ] Ran `npm install`
- [ ] Ran `npm run dev`
- [ ] Opened http://localhost:3007 (Admin)
- [ ] Opened http://localhost:3008 (Merchant)
- [ ] Opened http://localhost:3009 (Customer)
- [ ] Opened http://localhost:3006/api/v1/swagger-ui (API Docs)
- [ ] Read QUICK_START.md
- [ ] Read IMPLEMENTATION_GUIDE.md

---

## 🎉 You're All Set!

Your CRL Pay development environment is ready. Start building by running:

```bash
npm run dev
```

Then follow the **IMPLEMENTATION_GUIDE.md** to implement backend modules and connect the frontends to real APIs.

**Happy Coding!** 🚀
