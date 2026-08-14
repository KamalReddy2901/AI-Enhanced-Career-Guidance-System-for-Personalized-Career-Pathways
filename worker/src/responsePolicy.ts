export function shouldRetryWithoutJsonMode(
  status: number,
  hasJsonMode: boolean,
  errorPayload: unknown,
): boolean {
  if (status !== 400 || !hasJsonMode) return false;
  const text = JSON.stringify(errorPayload).toLowerCase();
  return text.includes('failed_generation')
    || text.includes('failed to validate json')
    || text.includes('json_validate_failed');
}
