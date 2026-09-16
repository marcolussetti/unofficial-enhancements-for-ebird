/**
 * Exotic status values that count toward the user's lists.
 * Per plan 5.3: rows missing the attribute count as native; only
 * `nativeNaturalized` counts. Kept as a single constant so the owner
 * can change this later.
 */
export const COUNTED_EXOTIC_VALUES = new Set<string>(['nativeNaturalized']);

export interface ParseResult {
  ok: true;
  speciesCodes: string[];
}

export interface ParseFailure {
  ok: false;
  error: string;
}

/**
 * Signals that the fetch did not land on a real, logged-in life list page.
 * VERIFY (plan spike 4): exact redirect/host behaviour for a logged-out
 * session has not been confirmed live yet. Update this once confirmed.
 */
function looksLoggedOut(finalUrl: string, doc: Document): boolean {
  let url: URL;
  try {
    url = new URL(finalUrl);
  } catch {
    return true;
  }
  if (url.hostname !== 'ebird.org' && url.hostname !== 'www.ebird.org') {
    return true;
  }
  if (!url.pathname.startsWith('/lifelist')) {
    return true;
  }
  if (doc.querySelector('input[type="password"]')) {
    return true;
  }
  return false;
}

export async function fetchList(url: string): Promise<ParseResult | ParseFailure> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: 'include' });
  } catch (e) {
    return { ok: false, error: `network error: ${(e as Error).message}` };
  }

  if (!response.ok) {
    return { ok: false, error: `HTTP ${response.status}` };
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');

  if (looksLoggedOut(response.url, doc)) {
    return { ok: false, error: 'not logged in (redirected away from life list)' };
  }

  return parseListDocument(doc);
}

export function parseListDocument(doc: Document): ParseResult {
  const speciesCodes: string[] = [];
  const rows = doc.querySelectorAll('li.Observation');
  for (const row of rows) {
    const link = row.querySelector('.Observation-species a[data-species-code]');
    if (!link) continue;
    const exotic = row.getAttribute('data-exotic-subfilter-target');
    if (exotic && !COUNTED_EXOTIC_VALUES.has(exotic)) continue;
    const code = link.getAttribute('data-species-code');
    if (code) speciesCodes.push(code);
  }
  return { ok: true, speciesCodes };
}
