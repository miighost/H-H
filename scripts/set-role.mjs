import "dotenv/config";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
const [email, role] = process.argv.slice(2);
if (
  !email ||
  ![
    "customer",
    "warehouse",
    "driver",
    "sales",
    "admin",
    "ceo",
    "staff",
  ].includes(role)
)
  throw Error("Usage: node scripts/set-role.mjs EMAIL ROLE");
const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!encoded) throw Error("Server service-account credential is required.");
initializeApp({
  credential: cert(JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))),
});
const auth = getAuth(),
  user = await auth.getUserByEmail(email);
if (role === "ceo" && email !== process.env.CEO_AUTHORISED_EMAIL)
  throw Error("CEO email must match authorised email.");
await auth.setCustomUserClaims(user.uid, {
  ...user.customClaims,
  hhRole: role,
});
console.log(
  `Role assigned: ${role}. User must sign out and sign in to refresh claims.`,
);
