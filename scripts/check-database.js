import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('🔗 Connected to database');
  
  // Check existing tables
  const tablesResult = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  
  console.log('\n📊 Existing tables:');
  tablesResult.rows.forEach(row => console.log('- ' + row.table_name));
  
  // Check subscriptions table structure
  const columnsResult = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'subscriptions' 
    ORDER BY ordinal_position
  `);
  
  console.log('\n📋 Subscriptions table columns:');
  columnsResult.rows.forEach(row => console.log('- ' + row.column_name + ' (' + row.data_type + ')'));
  
  await client.end();
  console.log('\n✅ Database check completed');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  await client.end();
}
