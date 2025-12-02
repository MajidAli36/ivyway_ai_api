import appleSignin from 'apple-signin-auth';
import { env } from '../config/env';

export interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string; // the Apple user id
  email?: string;
  email_verified?: string;
  is_private_email?: string;
}

/**
 * Verify Apple's identity token (JWT) and return the payload.
 * Uses the `apple-signin-auth` helper to validate signature and audience.
 */
export async function verifyIdentityToken(idToken: string): Promise<AppleTokenPayload> {
  if (!idToken) throw new Error('Identity token is required');

  // Use apple-signin-auth to verify the token
  const verification = await appleSignin.verifyIdToken(idToken, {
    audience: env.APPLE_CLIENT_ID, // Service Identifier (client ID) registered with Apple
    ignoreExpiration: false,
  });

  // verification contains payload fields
  return verification as unknown as AppleTokenPayload;
}

/**
 * (Optional) Generate a client secret for Apple services using the private key.
 * Not used in this minimal verification flow, but provided for completeness.
 */
export function generateClientSecret(): string | null {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY || !env.APPLE_CLIENT_ID) return null;

  try {
    const clientSecret = appleSignin.getClientSecret({
      clientID: env.APPLE_CLIENT_ID,
      teamID: env.APPLE_TEAM_ID,
      privateKey: env.APPLE_PRIVATE_KEY,
      keyIdentifier: env.APPLE_KEY_ID,
      expAfter: 15777000, // long lived expiration in seconds
    });

    return clientSecret;
  } catch (err) {
    console.warn('Unable to generate Apple client secret:', err);
    return null;
  }
}

export default {
  verifyIdentityToken,
  generateClientSecret,
};
