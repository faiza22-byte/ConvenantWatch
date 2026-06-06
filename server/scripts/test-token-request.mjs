import '../config/loadEnv.js';
import { qbConfig } from '../config/quickbooks.js';

const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

function basicAuthHeader() {
  const credentials = Buffer.from(`${qbConfig.clientId}:${qbConfig.clientSecret}`).toString("base64");
  return `Basic ${credentials}`;
}

console.log('Testing token refresh with:');
console.log('- Client ID:', qbConfig.clientId.slice(0, 10) + '...');
console.log('- Realm ID:', qbConfig.realmId);
console.log('- Refresh Token:', qbConfig.refreshToken.slice(0, 20) + '...');

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

try {
  console.log('\nCalling token endpoint...');
  const response = await fetch(TOKEN_URL, {
    signal: controller.signal,
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: qbConfig.refreshToken,
    }),
  });

  clearTimeout(timeoutId);
  
  console.log('Response status:', response.status);
  const data = await response.json();
  
  if (response.ok) {
    console.log('✅ TOKEN REFRESH SUCCESSFUL');
    console.log('- Access token expires in:', data.expires_in, 'seconds');
    console.log('- New token:', data.access_token.slice(0, 20) + '...');
  } else {
    console.log('❌ TOKEN REFRESH FAILED');
    console.log('Error:', data);
  }
} catch (err) {
  clearTimeout(timeoutId);
  if (err.name === 'AbortError') {
    console.error('❌ REQUEST TIMEOUT - Intuit server not responding within 10 seconds');
  } else {
    console.error('❌ REQUEST FAILED:', err.message);
  }
  process.exit(1);
}
