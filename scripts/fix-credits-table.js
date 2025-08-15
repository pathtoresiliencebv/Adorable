import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function fixCreditsTable() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Check current table structure
    console.log('📋 Checking credits table structure...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'credits' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Credits table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`- ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
    });
    
    // Check existing constraints
    console.log('\n🔍 Checking existing constraints...');
    const constraintsResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'credits'
    `);
    
    console.log('📋 Existing constraints:');
    constraintsResult.rows.forEach(row => {
      console.log(`- ${row.constraint_name} (${row.constraint_type})`);
    });
    
    // Add unique constraint on user_id if it doesn't exist
    console.log('\n🔧 Adding unique constraint on user_id...');
    try {
      await client.query(`
        ALTER TABLE credits 
        ADD CONSTRAINT credits_user_id_unique UNIQUE (user_id)
      `);
      console.log('✅ Unique constraint added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Unique constraint already exists');
      } else {
        console.error('❌ Error adding constraint:', error.message);
      }
    }
    
    // Test credits insertion again
    console.log('\n🧪 Testing credits insertion...');
    const creditsResult = await client.query(`
      INSERT INTO credits (user_id, balance, total_earned, total_used)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = credits.balance + $2,
        total_earned = credits.total_earned + $3,
        updated_at = NOW()
      RETURNING *
    `, ['test-user-123', 100, 100, 0]);
    
    console.log(`✅ Credits inserted/updated: ${creditsResult.rows[0].balance} credits`);
    
    await client.end();
    console.log('\n🎉 Credits table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing credits table:', error.message);
    await client.end();
  }
}

fixCreditsTable();
