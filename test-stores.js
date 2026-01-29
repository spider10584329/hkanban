// Test script to check Minew store API with correct endpoint
require('dotenv').config();
const crypto = require('crypto');

const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

async function testStores() {
  try {
    // Step 1: Login
    console.log('=== Step 1: Login ===');
    const hashedPassword = hashPassword(MINEW_PASSWORD);
    const loginUrl = `${MINEW_API_BASE}/apis/action/login`;

    const loginResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify({
        username: MINEW_USERNAME,
        password: hashedPassword,
      }),
    });

    const loginData = await loginResponse.json();

    let token = null;
    if (loginData.token) {
      token = loginData.token;
    } else if (loginData.data?.token) {
      token = loginData.data.token;
    }

    if (!token) {
      console.error('Failed to get token!');
      return;
    }

    console.log('✓ Login successful');

    // Step 2: Get stores using correct endpoint
    console.log('\n=== Step 2: Get Stores (Using /apis/esl/store/list) ===');
    const storesUrl = `${MINEW_API_BASE}/apis/esl/store/list?active=1`;
    console.log('URL:', storesUrl);

    const storesResponse = await fetch(storesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    console.log('\nResponse Status:', storesResponse.status);
    const storesData = await storesResponse.json();
    console.log('Response Body:', JSON.stringify(storesData, null, 2));

    if (storesData.code === 200) {
      console.log('\n=== SUCCESS ===');

      // Handle both array and object with items
      const stores = Array.isArray(storesData.data)
        ? storesData.data
        : (storesData.data?.items || []);

      console.log('Total stores:', stores.length);

      if (stores.length > 0) {
        console.log('\n=== Store Details ===');
        stores.forEach((store, index) => {
          console.log(`\nStore ${index + 1}:`);
          console.log('  Store ID:', store.id);
          console.log('  Name:', store.name);
          console.log('  Number:', store.number);
          console.log('  Address:', store.address || 'N/A');
          console.log('  Active:', store.active);
        });

        // Now test templates for the first store
        console.log('\n=== Step 3: Get Templates for First Store ===');
        const firstStoreId = stores[0].id;
        console.log('Using Store ID:', firstStoreId);

        const templatesUrl = `${MINEW_API_BASE}/apis/esl/template/findAll?page=1&size=100&storeId=${firstStoreId}`;
        console.log('Templates URL:', templatesUrl);

        const templatesResponse = await fetch(templatesUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json;charset=utf-8',
            'token': token,
          },
        });

        console.log('\nTemplates Response Status:', templatesResponse.status);
        const templatesData = await templatesResponse.json();
        console.log('Templates Response:', JSON.stringify(templatesData, null, 2));

        if (templatesData.code === 200) {
          const templates = templatesData.data?.rows || templatesData.data?.items || [];
          console.log('\n✓ Templates found:', templates.length);

          if (templates.length > 0) {
            console.log('\nFirst template:');
            console.log(JSON.stringify(templates[0], null, 2));
          } else {
            console.log('\nℹ️  No templates exist for this store.');
            console.log('You need to create templates in the Minew ESL Cloud platform.');
          }
        } else {
          console.log('\n✗ Templates fetch failed:', templatesData.msg);
        }
      }
    } else {
      console.log('\n=== ERROR ===');
      console.log('Error code:', storesData.code);
      console.log('Error message:', storesData.msg);
    }

  } catch (error) {
    console.error('\n=== EXCEPTION ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testStores();
