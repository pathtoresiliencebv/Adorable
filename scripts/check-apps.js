import { db } from '../src/db/schema.ts';
import { appsTable } from '../src/db/schema.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function checkApps() {
  try {
    console.log('🔍 Checking existing apps...');
    
    const apps = await db.select().from(appsTable);
    console.log('📊 Found apps:', apps.length);
    
    if (apps.length > 0) {
      console.log('📋 Apps:');
      apps.forEach((app, index) => {
        console.log(`${index + 1}. ID: ${app.id}`);
        console.log(`   Name: ${app.name}`);
        console.log(`   Description: ${app.description}`);
        console.log(`   Git Repo: ${app.gitRepo}`);
        console.log('');
      });
    } else {
      console.log('❌ No apps found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking apps:', error);
  } finally {
    await db.disconnect();
  }
}

checkApps();
