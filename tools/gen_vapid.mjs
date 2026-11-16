// Generates the VAPID key pair for phone notifications. Put both values in Vercel env vars (never in the repo):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT=mailto:you@example.com
import { vapidKeys } from '../api/_lib/push.mjs';
const k = vapidKeys();
console.log(`VAPID_PUBLIC_KEY=${k.publicKey}\nVAPID_PRIVATE_KEY=${k.privateKey}\nVAPID_SUBJECT=mailto:YOUR_EMAIL`);
