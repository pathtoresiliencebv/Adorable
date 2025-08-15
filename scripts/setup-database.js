import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Setting up database for Stripe integration...');

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.log('Please set DATABASE_URL in your .env.local file or environment variables');
  process.exit(1);
}

try {
  console.log('📄 Running Drizzle migrations...');
  
  // Run Drizzle migrations
  execSync('npx drizzle-kit migrate', { 
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env }
  });
  
  console.log('✅ Drizzle migrations completed');
  
  // Run the SQL script for additional setup
  console.log('📝 Running additional SQL setup...');
  
  const { Client } = await import('pg');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('🔗 Connected to database');
  
  // Read the SQL migration script
  const sqlPath = path.join(__dirname, 'setup-stripe-tables.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  
  // Execute the SQL script
  await client.query(sqlContent);
  console.log('✅ SQL setup completed');
  
  await client.end();
  console.log('🎉 Database setup completed successfully!');
  
} catch (error) {
  console.error('❌ Error setting up database:', error.message);
  process.exit(1);
}
