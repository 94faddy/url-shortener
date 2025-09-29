# 🔗 URL Shortener System - 9iot.cc

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.4-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Prisma-6.12-2D3748?style=for-the-badge&logo=prisma" alt="Prisma"/>
  <img src="https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="TailwindCSS"/>
</div>

<br/>

<div align="center">
  <strong>⚖️ LEGAL NOTICE</strong>
  <br/>
  <em>This shortened link system allows the use of source code on the 9iot.cc website only.<br/>
  Do not use this code without permission, as this code is licensed.<br/>
  Violators will be prosecuted under the law.</em>
</div>

---

## 📋 Table of Contents
- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Installation](#-installation)
- [⚙️ Configuration](#️-configuration)
- [📦 Database Setup](#-database-setup)
- [🏃‍♂️ Running the Application](#️-running-the-application)
- [🔄 Cron Jobs](#-cron-jobs)
- [📊 Analytics System](#-analytics-system)
- [🔐 Authentication](#-authentication)
- [📱 API Endpoints](#-api-endpoints)
- [🌍 Geolocation](#-geolocation)
- [📈 Performance](#-performance)
- [🐛 Troubleshooting](#-troubleshooting)
- [📄 License](#-license)

## ✨ Features

### Core Features
- 🔗 **URL Shortening** - Create short, memorable links with custom codes
- 📊 **Real-time Analytics** - Track clicks, locations, referrers, and more
- 🌍 **Geolocation Tracking** - Accurate visitor location detection with multiple fallback services
- 📱 **QR Code Generator** - Generate QR codes for your shortened links
- 🔐 **Authentication** - Secure login with Google OAuth and credentials
- 📈 **Dashboard** - Comprehensive analytics dashboard with charts and statistics
- ⏰ **Link Expiration** - Set expiration dates for temporary links
- 🎨 **Modern UI** - Beautiful glassmorphism design with dark theme
- 🚀 **High Performance** - Optimized with caching and efficient database queries

### Advanced Features
- **Hybrid Analytics System** - Combines real-time and aggregated data for optimal performance
- **Multi-service Geolocation** - Fallback through multiple IP geolocation services
- **Bulk Operations** - Manage multiple URLs at once
- **Smart Caching** - Intelligent data caching for improved performance
- **Automatic Cleanup** - Scheduled jobs to maintain database health
- **Session Management** - Hybrid JWT/Database session strategy

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.4.4** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS 4.0** - Utility-first CSS framework
- **Recharts** - Data visualization
- **Lucide React** - Icon library

### Backend
- **Next.js API Routes** - Backend API endpoints
- **Prisma ORM** - Database management
- **MySQL** - Primary database
- **NextAuth.js** - Authentication
- **Node-Cron** - Scheduled jobs

### Infrastructure
- **PM2** - Process management
- **Vercel** - Deployment platform (optional)
- **Cloudflare** - CDN and protection

## 🚀 Installation

### Prerequisites
- Node.js 18.0 or higher
- MySQL 8.0 or higher
- npm or yarn package manager
- PM2 (for production)

### Step 1: Clone the Repository
```bash
git clone [repository-url]
cd url-shortener
```

### Step 2: Install Dependencies
```bash
npm install
# or
yarn install
```

### Step 3: Environment Setup
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="mysql://username:password@localhost:3306/url_shortener"

# NextAuth
NEXTAUTH_URL="http://localhost:2957"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Security
CRON_SECRET="your-cron-secret"

# Optional: IP Geolocation
IPINFO_TOKEN="your-ipinfo-token"

# Session Configuration
SESSION_MAX_AGE="7200"
SESSION_UPDATE_AGE="1800"

# Base URL for production
BASE_URL="https://9iot.cc"
```

## ⚙️ Configuration

### Port Configuration
The application runs on port **2957** by default. To change:

1. Update `package.json`:
```json
{
  "scripts": {
    "dev": "next dev --port YOUR_PORT",
    "start": "next start -p YOUR_PORT"
  }
}
```

2. Update `.env`:
```env
NEXTAUTH_URL="http://localhost:YOUR_PORT"
```

### Domain Configuration
For production deployment on 9iot.cc:

1. Update `middleware.ts` allowed hosts
2. Set `BASE_URL` in environment variables
3. Configure DNS records properly

## 📦 Database Setup

### Initialize Database
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

### Database Schema
The system uses the following main tables:
- `User` - User accounts
- `Url` - Shortened URLs
- `Click` - Click tracking with geolocation
- `Analytics` - Aggregated analytics data
- `Session` - User sessions
- `Account` - OAuth accounts

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# Application will be available at http://localhost:2957
```

### Production Mode with PM2
```bash
# Start the application
chmod +x start.sh
./start.sh

# Stop the application
chmod +x stop.sh
./stop.sh
```

### Build for Production
```bash
npm run build
npm run start
```

## 🔄 Cron Jobs

The system includes automated scheduled tasks:

### Daily Analytics Aggregation
- **Schedule**: Daily at 1:00 AM (Asia/Bangkok)
- **Purpose**: Aggregate click data for performance optimization
- **Endpoint**: `/api/cron/daily-analytics`

### Weekly Cleanup
- **Schedule**: Every Sunday at 2:00 AM
- **Purpose**: Remove old click data (>180 days)
- **Endpoint**: Internal scheduler

### Health Check
- **Schedule**: Every 30 minutes
- **Purpose**: Monitor system health and database connectivity

### Manual Trigger
```bash
# Trigger analytics aggregation manually
curl -X POST http://localhost:2957/api/cron/daily-analytics \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 📊 Analytics System

### Hybrid Approach
The system uses a hybrid analytics approach for optimal performance:

1. **Real-time Data** - Direct queries to Click table for today's data
2. **Historical Data** - Pre-aggregated data from Analytics table
3. **Automatic Aggregation** - Daily cron job processes yesterday's data

### Available Metrics
- Total clicks and unique visitors
- Click distribution by country
- Referrer analysis
- Hourly activity patterns
- Device and browser statistics
- City-level geolocation

## 🔐 Authentication

### Supported Methods
1. **Google OAuth** - Login with Google account
2. **Email/Password** - Traditional authentication

### Session Strategy
- **JWT Sessions** - For credential-based authentication
- **Database Sessions** - For OAuth providers
- **Session Duration** - 2 hours default, 30-minute refresh

## 📱 API Endpoints

### URL Management
- `GET /api/urls` - List user's URLs
- `POST /api/urls` - Create new shortened URL
- `PUT /api/urls/[id]` - Update URL settings
- `DELETE /api/urls/[id]` - Delete URL

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics?urlId=[id]` - Get URL-specific analytics

### Authentication
- `POST /api/register` - User registration
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

### Redirect
- `GET /[shortCode]` - Redirect to original URL

## 🌍 Geolocation

### IP Detection Priority
1. Cloudflare IP (`cf-connecting-ip`)
2. Real IP (`x-real-ip`)
3. Forwarded IP (`x-forwarded-for`)
4. Direct connection IP

### Geolocation Services (with fallback)
1. **ip-api.com** - Primary service (free)
2. **ipinfo.io** - Secondary (optional token)
3. **ipapi.co** - Tertiary fallback

### Local Development
For localhost/private IPs, defaults to Bangkok, Thailand location.

## 📈 Performance

### Optimization Strategies
- **Database Indexing** - Optimized queries with proper indexes
- **Data Aggregation** - Pre-processed analytics for historical data
- **Caching** - Smart caching of frequently accessed data
- **Lazy Loading** - Components load on demand
- **Image Optimization** - Next.js automatic image optimization

### Monitoring
- Built-in health checks every 30 minutes
- Performance metrics in analytics responses
- Debug information in development mode

## 🐛 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Test database connection
npx prisma db pull

# Reset database
npx prisma migrate reset
```

#### Session Issues
```bash
# Clear expired sessions
curl -X POST http://localhost:2957/api/auth/clear-session
```

#### Port Already in Use
```bash
# Find process using port 2957
lsof -i :2957

# Kill the process
kill -9 [PID]
```

### Debug Mode
Enable debug mode in `.env`:
```env
NEXTAUTH_DEBUG=true
NODE_ENV=development
```

## 📄 License

**⚠️ PROPRIETARY LICENSE**

This shortened link system is proprietary software licensed exclusively for use on the 9iot.cc website.

### Terms:
1. **Single Domain License** - This code is licensed for use only on 9iot.cc
2. **No Redistribution** - Code cannot be copied, modified, or distributed
3. **No Commercial Use** - Cannot be used for any other commercial purposes
4. **Legal Protection** - Violations will be prosecuted under applicable law

### Copyright Notice:
```
Copyright (c) 2025 9iot.cc
All rights reserved.

Unauthorized copying, modification, distribution, or use of this software,
via any medium, is strictly prohibited without explicit written permission.
```

---

<div align="center">
  <strong>Built with ❤️ for 9iot.cc</strong>
  <br/>
  <em>High-performance URL shortening with advanced analytics</em>
</div>