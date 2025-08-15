import { db } from '../src/db/schema.ts';
import { appsTable } from '../src/db/schema.ts';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createTestApp() {
  try {
    console.log('🔧 Creating test app...');
    
    // Use a hardcoded UUID for testing
    const appId = '550e8400-e29b-41d4-a716-446655440000';
    const testApp = {
      id: appId,
      name: 'Test App',
      description: 'A test app for debugging',
      gitRepo: 'test-repo',
      baseId: 'nextjs-dkjfgdf',
      previewDomain: 'test-app.qreatify.io',
    };

    console.log('📝 Test app data:', testApp);
    
    const result = await db.insert(appsTable).values(testApp);
    console.log('✅ Test app created successfully!');
    console.log('🆔 App ID:', appId);
    console.log('📋 Use this ID for testing:');
    console.log(`curl -X POST http://localhost:3005/api/chat -H "Content-Type: application/json" -H "Adorable-App-Id: ${appId}" -d '{"messages":[{"id":"test","role":"user","content":"hello"}]}'`);
    
  } catch (error) {
    console.error('❌ Error creating test app:', error);
  } finally {
    await db.disconnect();
  }
}

createTestApp();
