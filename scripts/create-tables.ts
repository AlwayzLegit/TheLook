import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";

// Use connection pooler for IPv4 compatibility
const connectionString = "postgresql://postgres:TheLookdb2026@db.hrrijetwksnfjtrcxihk.supabase.co:6543/postgres?sslmode=require";

async function createTables() {
  console.log("🔄 Connecting to Supabase...\n");
  
  try {
    const sql = postgres(connectionString, { 
      prepare: false,
      ssl: { rejectUnauthorized: false }
    });

    // Read schema SQL
    const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf-8");

    console.log("📋 Creating tables...\n");
    
    // Execute schema
    await sql.unsafe(schemaSQL);
    
    console.log("✅ Tables created successfully!\n");
    
    await sql.end();
    return true;
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    return false;
  }
}

createTables();
