const SPECIES_PATH_RE = /^\/species\/([a-z0-9]+)(\/.*)?$/;
const BINOMIAL_RE = /^[A-Z][a-z]+ [a-z-]+$/;
const NON_SPECIES_COMMON_NAME_HINTS = [' sp.', '/', ' x ', '(', 'Domestic'];

export interface SpeciesLink {
  anchor: HTMLAnchorElement;
  code: string;
  row: Element;
  /** true if the full-species check fell back to the common-name heuristic (5.6, rule 2) */
  usedFallbackRule: boolean;
}

function isVisible(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function findRowContainer(anchor: HTMLAnchorElement): Element {
  return anchor.closest('li, tr') ?? anchor.parentElement ?? anchor;
}

/**
 * Plan 5.6 full-species filter. Returns whether the link should be marked,
 * and whether rule 2 (common-name fallback) was used.
 */
function checkFullSpecies(anchor: HTMLAnchorElement): { mark: boolean; usedFallbackRule: boolean } {
  const row = findRowContainer(anchor);
  const sciEl =
    anchor.querySelector('.Heading-sub--sci') ?? row.querySelector('.Heading-sub--sci');
  if (sciEl) {
    const sci = (sciEl.textContent ?? '').trim();
    return { mark: BINOMIAL_RE.test(sci), usedFallbackRule: false };
  }

  const commonName = (anchor.textContent ?? '').trim();
  const hasHint = NON_SPECIES_COMMON_NAME_HINTS.some((hint) => commonName.includes(hint));
  return { mark: !hasHint, usedFallbackRule: true };
}

export function findSpeciesLinks(root: ParentNode = document): {
  links: SpeciesLink[];
  fallbackUsed: boolean;
} {
  const links: SpeciesLink[] = [];
  let fallbackUsed = false;

  const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const anchor of anchors) {
    if (anchor.hasAttribute('data-uee-processed')) continue;
    if (anchor.closest('[data-uee-badge]')) continue;

    let resolved: URL;
    try {
      resolved = new URL(anchor.getAttribute('href') ?? '', location.href);
    } catch {
      continue;
    }
    if (!/(^|\.)ebird\.org$/.test(resolved.hostname)) continue;

    const match = SPECIES_PATH_RE.exec(resolved.pathname);
    if (!match) continue;

    if (!isVisible(anchor) || !(anchor.textContent ?? '').trim()) continue;

    const { mark, usedFallbackRule } = checkFullSpecies(anchor);
    anchor.setAttribute('data-uee-processed', 'true');
    if (!mark) continue;

    if (usedFallbackRule) fallbackUsed = true;
    links.push({ anchor, code: match[1]!, row: findRowContainer(anchor), usedFallbackRule });
  }

  return { links, fallbackUsed };
}
