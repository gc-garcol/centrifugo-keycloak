const KEYCLOAK_TOKEN_URL = 'http://localhost:8080/realms/partner/protocol/openid-connect/token';
const CLIENT_ID = 'partner-vng-id';
const CLIENT_SECRET = 'AyiUMUN3m2TJ1LstrviFV2qjALHnBZ6Z';

const res = await fetch(KEYCLOAK_TOKEN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});

if (!res.ok) {
  console.error('Token request failed:', res.status, await res.text());
  process.exit(1);
}

const { access_token } = await res.json();
const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString());
console.log('JWT payload:', JSON.stringify(payload, null, 2));
