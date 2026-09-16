/**
 * Inline SVG glyphs, adapted from Lucide (ISC licence, https://lucide.dev).
 * See README for attribution.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvg(paths: Array<{ tag: 'path' | 'rect'; attrs: Record<string, string> }>): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('class', 'uee-badge-icon');
  for (const { tag, attrs } of paths) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      el.setAttribute(key, value);
    }
    svg.appendChild(el);
  }
  return svg;
}

export function createBinocularsIcon(): SVGSVGElement {
  return createSvg([
    { tag: 'path', attrs: { d: 'M10 10h4' } },
    { tag: 'path', attrs: { d: 'M19 7V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v3' } },
    {
      tag: 'path',
      attrs: {
        d: 'M20 21a2 2 0 0 0 2-2v-3.851c0-1.39-2-2.962-2-4.829V8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v11a2 2 0 0 0 2 2z',
      },
    },
    { tag: 'path', attrs: { d: 'M 22 16 L 2 16' } },
    {
      tag: 'path',
      attrs: {
        d: 'M4 21a2 2 0 0 1-2-2v-3.851c0-1.39 2-2.962 2-4.829V8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2z',
      },
    },
    { tag: 'path', attrs: { d: 'M9 7V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v3' } },
  ]);
}

export function createCalendarIcon(): SVGSVGElement {
  return createSvg([
    { tag: 'path', attrs: { d: 'M8 2v3' } },
    { tag: 'path', attrs: { d: 'M16 2v3' } },
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'path', attrs: { d: 'M3 9h18' } },
  ]);
}
