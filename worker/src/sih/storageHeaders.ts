/**
 * Build Supabase Storage server-request headers for the elevated (service-role) key.
 *
 * Modern opaque sb_secret_* keys are NOT JWTs. They must be sent as `apikey` only.
 * Sending them as `Authorization: Bearer` is invalid for modern Supabase key format.
 *
 * Legacy JWT service-role keys (eyJ....) require both `apikey` and `Authorization: Bearer`
 * for compatibility with older local Supabase / self-hosted deployments.
 *
 * Neither key is returned, logged, or included in error responses.
 */
export function buildSupabaseStorageHeaders(elevatedKey: string): Record<string, string> {
  // Modern opaque keys start with 'sb_secret_' or other non-JWT prefix.
  // JWT keys start with 'eyJ' (base64url-encoded JSON object: {"...}).
  const isLegacyJwt = elevatedKey.startsWith('eyJ');

  if (isLegacyJwt) {
    return {
      apikey: elevatedKey,
      Authorization: `Bearer ${elevatedKey}`,
    };
  }

  // Modern sb_secret_* key: apikey only, no Bearer JWT
  return {
    apikey: elevatedKey,
  };
}
