import { createBinocularsIcon, createCalendarIcon } from './icons';

export type BadgeKind = 'world-life' | 'world-year' | 'county-life' | 'county-year';

export interface ListSets {
  worldLife?: Set<string>;
  worldYear?: Set<string>;
  countyLife?: Set<string>;
  countyYear?: Set<string>;
}

const BADGE_STYLE: Record<BadgeKind, { color: string; icon: () => SVGSVGElement }> = {
  'world-life': { color: '#C62828', icon: createBinocularsIcon },
  'world-year': { color: '#B26A00', icon: createCalendarIcon },
  'county-life': { color: '#1565C0', icon: createBinocularsIcon },
  'county-year': { color: '#00838F', icon: createCalendarIcon },
};

const ROW_HIGHLIGHT_COLOR: Record<BadgeKind, string> = {
  'world-life': 'rgba(198, 40, 40, 0.15)',
  'world-year': 'rgba(178, 106, 0, 0.15)',
  'county-life': 'rgba(21, 101, 192, 0.15)',
  'county-year': 'rgba(0, 131, 143, 0.15)',
};

/**
 * Plan 5.7: world badge first, then county badge; life takes priority
 * over year within each scope.
 */
export function decideBadges(code: string, sets: ListSets, hasCounty: boolean): BadgeKind[] {
  const kinds: BadgeKind[] = [];

  if (sets.worldLife && !sets.worldLife.has(code)) {
    kinds.push('world-life');
  } else if (sets.worldYear && !sets.worldYear.has(code)) {
    kinds.push('world-year');
  }

  if (hasCounty) {
    if (sets.countyLife && !sets.countyLife.has(code)) {
      kinds.push('county-life');
    } else if (sets.countyYear && !sets.countyYear.has(code)) {
      kinds.push('county-year');
    }
  }

  return kinds;
}

function tooltipFor(kind: BadgeKind, year: number, countyName: string | undefined): string {
  switch (kind) {
    case 'world-life':
      return 'Not on your life list';
    case 'world-year':
      return `Not on your ${year} list`;
    case 'county-life':
      return `Not on your ${countyName ?? 'county'} life list`;
    case 'county-year':
      return `Not on your ${countyName ?? 'county'} ${year} list`;
  }
}

export function createBadge(kind: BadgeKind, year: number, countyName: string | undefined): HTMLElement {
  const { color, icon } = BADGE_STYLE[kind];
  const badge = document.createElement('span');
  badge.className = `uee-badge uee-badge--${kind}`;
  badge.setAttribute('data-uee-badge', kind);
  badge.setAttribute('role', 'img');
  const tooltip = tooltipFor(kind, year, countyName);
  badge.setAttribute('title', tooltip);
  badge.setAttribute('aria-label', tooltip);
  badge.style.backgroundColor = color;
  badge.appendChild(icon());
  return badge;
}

export function renderBadges(
  anchor: HTMLAnchorElement,
  kinds: BadgeKind[],
  year: number,
  countyName: string | undefined,
): void {
  if (kinds.length === 0) return;
  const parent = anchor.parentNode;
  if (!parent) return;
  let insertAfter: Node = anchor;
  for (const kind of kinds) {
    const badge = createBadge(kind, year, countyName);
    parent.insertBefore(badge, insertAfter.nextSibling);
    insertAfter = badge;
  }
}

export function removeAllBadges(root: ParentNode = document): void {
  root.querySelectorAll('[data-uee-badge]').forEach((el) => el.remove());
}

/**
 * Highlights the whole row in a faint version of the highest-priority badge
 * colour. `kinds` is expected in the same world-then-county, life-then-year
 * priority order `decideBadges` returns, so the first entry wins.
 */
export function applyRowHighlight(row: Element, kinds: BadgeKind[]): void {
  const kind = kinds[0];
  if (!kind || !(row instanceof HTMLElement)) return;
  row.setAttribute('data-uee-row-highlight', kind);
  row.style.setProperty('background-color', ROW_HIGHLIGHT_COLOR[kind], 'important');
}

export function removeAllRowHighlights(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-uee-row-highlight]').forEach((el) => {
    el.removeAttribute('data-uee-row-highlight');
    el.style.removeProperty('background-color');
  });
}

export function clearProcessedMarks(root: ParentNode = document): void {
  root.querySelectorAll('[data-uee-processed]').forEach((el) => el.removeAttribute('data-uee-processed'));
}
