// Test script to check Minew template API
require('dotenv').config();
const crypto = require('crypto');

const MINEW_API_BASE = process.env.MINEW_API_BASE || 'https://cloud.minewesl.com';
const MINEW_USERNAME = process.env.MINEW_USERNAME || '';
const MINEW_PASSWORD = process.env.MINEW_PASSWORD || '';

function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex').toLowerCase();
}

async function testTemplates() {
  try {
    // Step 1: Login
    console.log('=== Step 1: Login ===');
    console.log('API Base:', MINEW_API_BASE);
    console.log('Username:', MINEW_USERNAME);

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
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

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

    console.log('Token obtained:', token.substring(0, 20) + '...');

    // Step 2: Get stores
    console.log('\n=== Step 2: Get Stores ===');

    // Try multiple approaches
    const storesUrl1 = `${MINEW_API_BASE}/apis/esl/store/listPage?page=1&size=100`;
    console.log('Trying URL 1:', storesUrl1);

    const storesResponse1 = await fetch(storesUrl1, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    const storesData1 = await storesResponse1.json();
    console.log('Stores Response (listPage):', JSON.stringify(storesData1, null, 2));

    // Try alternative endpoint
    const storesUrl2 = `${MINEW_API_BASE}/apis/esl/store/findAll?page=1&size=100`;
    console.log('\nTrying URL 2:', storesUrl2);

    const storesResponse2 = await fetch(storesUrl2, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    const storesData2 = await storesResponse2.json();
    console.log('Stores Response (findAll):', JSON.stringify(storesData2, null, 2));

    let storesData = storesData1.code === 200 ? storesData1 : storesData2;

    if (!storesData.data?.items || storesData.data.items.length === 0) {
      console.error('No stores found! Let me try to use a hardcoded store ID for testing...');
      // Use a test store ID - you'll need to replace this
      console.log('Please provide a valid storeId to test templates');
      return;
    }

    const storeId = storesData.data.items[0].storeId;
    console.log('Using store ID:', storeId);

    // Step 3: Get templates
    console.log('\n=== Step 3: Get Templates ===');
    const templatesUrl = `${MINEW_API_BASE}/apis/esl/template/findAll?page=1&size=100&storeId=${storeId}`;
    console.log('Templates URL:', templatesUrl);

    const templatesResponse = await fetch(templatesUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'token': token,
      },
    });

    console.log('Templates Response Status:', templatesResponse.status);
    const templatesData = await templatesResponse.json();
    console.log('Templates Response:', JSON.stringify(templatesData, null, 2));

    if (templatesData.code === 200 && templatesData.data) {
      console.log('\n=== Templates Found ===');
      console.log('Total templates:', templatesData.data.totalNum || templatesData.data.items?.length || 0);

      if (templatesData.data.items && templatesData.data.items.length > 0) {
        console.log('\nFirst template:');
        console.log(JSON.stringify(templatesData.data.items[0], null, 2));
      }
    } else {
      console.error('Failed to fetch templates:', templatesData.msg);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testTemplates();
