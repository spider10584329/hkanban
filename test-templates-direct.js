// Direct template test with manual store ID
require('dotenv').config();
const crypto = require('crypto');

const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

// REPLACE THIS WITH YOUR ACTUAL STORE ID FROM THE DROPDOWN
const TEST_STORE_ID = ''; // e.g., '2015971234567890123'

function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

async function testTemplatesDirect() {
  try {
    if (!TEST_STORE_ID) {
      console.error('ERROR: Please set TEST_STORE_ID in the script to your actual store ID from the dropdown');
      console.log('\nTo find your store ID:');
      console.log('1. Open your browser to the devices page');
      console.log('2. Open Developer Tools (F12)');
      console.log('3. Go to the Network tab');
      console.log('4. Look for the stores API call and find the storeId in the response');
      return;
    }

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
    console.log('Token:', token.substring(0, 30) + '...');

    // Step 2: Test templates directly
    console.log('\n=== Step 2: Fetch Templates ===');
    console.log('Using Store ID:', TEST_STORE_ID);

    const templatesUrl = `${MINEW_API_BASE}/apis/esl/template/findAll?page=1&size=100&storeId=${TEST_STORE_ID}`;
    console.log('URL:', templatesUrl);

    const templatesResponse = await fetch(templatesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    console.log('\nResponse Status:', templatesResponse.status);
    const templatesData = await templatesResponse.json();
    console.log('Response Body:', JSON.stringify(templatesData, null, 2));

    if (templatesData.code === 200) {
      console.log('\n=== SUCCESS ===');
      console.log('Total templates:', templatesData.data?.totalNum || templatesData.data?.items?.length || 0);

      if (templatesData.data?.items && templatesData.data.items.length > 0) {
        console.log('\n=== First Template ===');
        console.log(JSON.stringify(templatesData.data.items[0], null, 2));
      } else {
        console.log('\nNo templates found in this store.');
        console.log('You may need to create templates in the Minew ESL Cloud platform first.');
      }
    } else {
      console.log('\n=== ERROR ===');
      console.log('Error code:', templatesData.code);
      console.log('Error message:', templatesData.msg);
    }

  } catch (error) {
    console.error('\n=== EXCEPTION ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTemplatesDirect();
