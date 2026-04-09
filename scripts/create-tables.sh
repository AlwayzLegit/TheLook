#!/bin/bash

# Supabase Project ID
PROJECT_REF="quvvoxhiigdharzwxwja"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1dnZveGhpaWdkaGFyend4d2phIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY2NjI0MiwiZXhwIjoyMDkxMjQyMjQyfQ.HRrbTms_NkBmCuZ6yGuZsE0ELzF5yrfCh5eMP5Xy1qI"

echo "🔄 Creating tables via Supabase Management API..."

# Read the SQL file
SQL=$(cat supabase/schema.sql | jq -sR .)

# Execute SQL via Management API
curl -X POST "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": ${SQL}}" 2>/dev/null

echo ""
echo "✅ Done"
