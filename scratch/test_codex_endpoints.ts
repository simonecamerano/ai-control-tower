import fs from 'fs';
import path from 'path';

async function run() {
  const authPath = path.join(process.env.HOME || '', '.codex', 'auth.json');
  if (!fs.existsSync(authPath)) {
    console.error('No auth.json found at', authPath);
    return;
  }

  const auth = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
  const accessToken = auth.tokens?.access_token;
  const accountId = auth.tokens?.account_id;

  if (!accessToken) {
    console.error('No access token found in auth.json');
    return;
  }

  console.log('Account ID:', accountId);
  console.log('Access token starts with:', accessToken.substring(0, 15));

  const endpoints = [
    { name: 'chatgpt-backend-models', url: 'https://chatgpt.com/backend-api/models' },
    { name: 'chatgpt-backend-accounts', url: 'https://chatgpt.com/backend-api/accounts' },
    { name: 'chatgpt-backend-wham-apps', url: 'https://chatgpt.com/backend-api/wham/apps' },
    { name: 'chatgpt-backend-wham-usage', url: 'https://chatgpt.com/backend-api/wham/usage' },
    { name: 'chatgpt-backend-codex-models', url: 'https://chatgpt.com/backend-api/codex/models' },
    { name: 'openai-v1-models', url: 'https://api.openai.com/v1/models' },
    { name: 'openai-v1-accounts', url: 'https://api.openai.com/v1/accounts' }
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting ${ep.name} (${ep.url})...`);
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      };
      if (accountId) {
        headers['ChatGPT-Account-Id'] = accountId;
      }
      
      const res = await fetch(ep.url, { headers });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log('Response (JSON):', JSON.stringify(json, null, 2).substring(0, 1000));
      } catch {
        console.log('Response (Text, first 500 chars):', text.substring(0, 500));
      }
    } catch (err: any) {
      console.error('Error:', err.message);
    }
  }
}

run();
