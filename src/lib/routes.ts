/** Default return path for game modes launched from spin-2 */
export const SPIN2_PATH = "/spin-2";

/** Build a game URL with an encoded return path (for spin-2 navigation). */
export function gameUrlWithReturn(gamePath: string, returnPath: string = SPIN2_PATH): string {
  return `${gamePath}?from=${encodeURIComponent(returnPath)}`;
}

/** Read `?from=` and normalize to an app path (e.g. `/spin-2`). */
export function parseReturnHref(
  search: string,
  fallback: string = "/spin"
): string {
  const from = new URLSearchParams(search).get("from");
  if (!from) return fallback;
  try {
    const decoded = decodeURIComponent(from);
    if (decoded.startsWith("/")) return decoded;
    return `/${decoded}`;
  } catch {
    return fallback;
  }
}
