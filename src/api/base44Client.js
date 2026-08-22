import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// Base44 exposes entity/function names dynamically from the app schema. In a
// plain-JS project with checkJs enabled, the SDK's generic fallback types infer
// some dynamic calls as void or broad string|object unions even though their
// runtime contracts are entity records/JSON. Keep that looseness at the SDK
// boundary so the rest of the application remains type-checked normally.
export const base44 = /** @type {any} */ (client);
