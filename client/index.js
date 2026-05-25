import { Centrifuge } from 'centrifuge';
import WebSocket from 'ws';

const KEYCLOAK_TOKEN_URL = 'http://localhost:8080/realms/partner/protocol/openid-connect/token';
const CENTRIFUGO_WS_URL = 'ws://localhost:8000/connection/websocket';
const CLIENT_ID = 'partner-vng-id';
const CLIENT_SECRET = 'AyiUMUN3m2TJ1LstrviFV2qjALHnBZ6Z';

async function fetchToken() {
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
    throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  }

  const { access_token } = await res.json();
  return access_token;
}

function subscribeToChannel(centrifuge, channel) {
  const sub = centrifuge.newSubscription(channel);

  sub.on('subscribed', (ctx) => console.log(`[${channel}] subscribed`, ctx.wasRecovering ? '(recovered)' : ''));
  sub.on('publication', (ctx) => console.log(`[${channel}] publication:`, JSON.stringify(ctx.data)));
  sub.on('join', (ctx) => console.log(`[${channel}] join:`, ctx.info));
  sub.on('leave', (ctx) => console.log(`[${channel}] leave:`, ctx.info));
  sub.on('error', (ctx) => console.error(`[${channel}] error:`, ctx));
  sub.on('unsubscribed', (ctx) => console.log(`[${channel}] unsubscribed:`, ctx));

  sub.subscribe();
  return sub;
}

async function main() {
  console.log('Fetching access token from Keycloak...');
  const token = await fetchToken();
  console.log('Access token obtained.\n');

  const centrifuge = new Centrifuge(CENTRIFUGO_WS_URL, {
    token,
    websocket: WebSocket,
    // Refresh the token before it expires
    getToken: async () => {
      console.log('Refreshing access token...');
      return fetchToken();
    },
  });

  centrifuge.on('connecting', (ctx) => console.log('Connecting to Centrifugo...', ctx.reason));
  centrifuge.on('connected', (ctx) => console.log('Connected to Centrifugo. Client ID:', ctx.client));
  centrifuge.on('disconnected', (ctx) => console.log('Disconnected:', ctx.reason, `(code ${ctx.code})`));
  centrifuge.on('error', (ctx) => console.error('Connection error:', ctx));

  subscribeToChannel(centrifuge, 'private-room:VNG');
  subscribeToChannel(centrifuge, 'public-room:GLOBAL');

  centrifuge.connect();

  process.on('SIGINT', () => {
    console.log('\nDisconnecting...');
    centrifuge.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
