#!/bin/bash

echo "=============================================="
echo "  The Look Hair Salon — Staging Setup"
echo "=============================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo ""
    echo "Please create .env.local with your Supabase credentials:"
    echo ""
    echo "POSTGRES_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
    echo "NEXTAUTH_SECRET=your-secret-here"
    echo "ADMIN_EMAIL=admin@thelook.com"
    echo "ADMIN_PASSWORD=your-password"
    echo "RESEND_API_KEY=re_your_key"
    echo "CRON_SECRET=your-cron-secret"
    echo ""
    exit 1
fi

echo "✅ .env.local found"
echo ""

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check if POSTGRES_URL is set
if [ -z "$POSTGRES_URL" ]; then
    echo "❌ POSTGRES_URL not set in .env.local"
    echo "Please add your Supabase connection string."
    exit 1
fi

echo "✅ POSTGRES_URL is set"
echo ""
echo "🔄 Setting up database..."
echo ""

# Push schema to database
echo "Creating tables..."
npx drizzle-kit push

echo ""
echo "🌱 Seeding database with sample data..."
npx tsx src/lib/seed.ts

echo ""
echo "=============================================="
echo "  ✅ Setup Complete!"
echo "=============================================="
echo ""
echo "Your staging environment is ready:"
echo "  • Database: Connected to Supabase"
echo "  • Tables: services, stylists, appointments, etc."
echo "  • Sample data: Loaded"
echo ""
echo "Next steps:"
echo "  1. Restart the dev server: npm run dev"
echo "  2. Visit http://localhost:3000/book to test"
echo "  3. Visit http://localhost:3000/admin to access dashboard"
echo ""
