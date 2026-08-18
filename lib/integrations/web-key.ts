import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

function getSigningSecret() {
  return process.env.INTEGRATIONS_SIGNING_SECRET || null;
}

export function generateWebIntegrationToken(organizationId: string) {
  const secret = getSigningSecret();

  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`web-leads:${organizationId}`)
    .digest("base64url");
}

export function verifyWebIntegrationToken(
  organizationId: string,
  token: string
) {
  const expected = generateWebIntegrationToken(organizationId);

  if (!expected || !token) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  if (expectedBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, tokenBuffer);
}
