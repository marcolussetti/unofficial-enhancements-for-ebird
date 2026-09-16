const COUNTY_CODE_RE = /^[A-Z]{2}-[A-Z0-9]+-[A-Z0-9]+$/;

export interface CountyInfo {
  code: string;
  name: string;
}


export function detectCounty(doc: Document): CountyInfo | undefined {
  const links = doc.querySelectorAll<HTMLAnchorElement>('nav.Breadcrumbs a[href*="/region/"]');
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    let pathname: string;
    try {
      pathname = new URL(href, location.href).pathname;
    } catch {
      continue;
    }
    const code = pathname.replace(/^\/region\//, '').split(/[?#]/)[0] ?? '';
    if (COUNTY_CODE_RE.test(code)) {
      return { code, name: (link.textContent ?? '').trim() };
    }
  }
  return undefined;
}
