import type { Feature } from '../../core/feature';
import { onStorageChanged, type ListCache } from '../../core/storage';
import { detectCounty } from './county';
import { findSpeciesLinks } from './links';
import { fetchList } from './fetch-parse';
import {
  acquireLock,
  currentYear,
  isStale,
  listUrl,
  readListCache,
  releaseLock,
  writeListCache,
  type ListId,
} from './lists';
import { decideBadges, removeAllBadges, renderBadges, clearProcessedMarks, type ListSets } from './badges';

const WORLD_LIFE: ListId = { region: 'world', period: 'life' };
const WORLD_YEAR: ListId = { region: 'world', period: 'year' };

function toSet(cache: ListCache | undefined): Set<string> | undefined {
  if (!cache || cache.fetchedAt === null) return undefined;
  return new Set(cache.speciesCodes);
}

async function ensureFetched(id: ListId): Promise<void> {
  const cache = await readListCache(id);
  if (!isStale(cache)) return;
  const acquired = await acquireLock(id);
  if (!acquired) return;
  try {
    const result = await fetchList(listUrl(id));
    const now = Date.now();
    if (result.ok) {
      const next: ListCache = {
        region: id.region,
        regionName: cache?.regionName,
        period: id.period,
        year: id.period === 'year' ? currentYear() : undefined,
        fetchedAt: now,
        speciesCodes: result.speciesCodes,
      };
      await writeListCache(next);
    } else {
      const next: ListCache = {
        region: id.region,
        regionName: cache?.regionName,
        period: id.period,
        year: cache?.year,
        fetchedAt: cache?.fetchedAt ?? null,
        speciesCodes: cache?.speciesCodes ?? [],
        lastError: result.error,
        lastErrorAt: now,
      };
      await writeListCache(next);
    }
  } finally {
    await releaseLock(id);
  }
}

async function annotate(countyId: ListId | undefined, countyName: string | undefined): Promise<void> {
  removeAllBadges();
  clearProcessedMarks();

  const [worldLife, worldYear, countyLife, countyYear] = await Promise.all([
    readListCache(WORLD_LIFE),
    readListCache(WORLD_YEAR),
    countyId ? readListCache({ region: countyId.region, period: 'life' }) : Promise.resolve(undefined),
    countyId ? readListCache({ region: countyId.region, period: 'year' }) : Promise.resolve(undefined),
  ]);

  const sets: ListSets = {
    worldLife: toSet(worldLife),
    worldYear: toSet(worldYear),
    countyLife: toSet(countyLife),
    countyYear: toSet(countyYear),
  };

  const hasCounty = !!countyId;
  const { links } = findSpeciesLinks(document);
  const year = currentYear();

  for (const { anchor, code } of links) {
    const kinds = decideBadges(code, sets, hasCounty);
    renderBadges(anchor, kinds, year, countyName);
  }
}

export const listMarkersFeature: Feature = {
  id: 'list-markers',
  name: 'Life and year list markers',
  description:
    "Adds badges after species links showing whether the species is on your world/county life or current-year list.",
  defaultEnabled: true,
  matches(): boolean {
    return true;
  },
  async run(): Promise<void> {
    let countyId: ListId | undefined;
    let countyName: string | undefined;

    // County badges aren't restricted to checklist pages: any page with a
    // region breadcrumb (checklists, hotspot lists, etc.) gets them.
    const county = detectCounty(document);
    if (county) {
      countyId = { region: county.code, period: 'life' };
      countyName = county.name;
    }

    const requiredIds: ListId[] = [WORLD_LIFE, WORLD_YEAR];
    if (countyId) {
      requiredIds.push(
        { region: countyId.region, period: 'life' },
        { region: countyId.region, period: 'year' },
      );
    }

    // Step 3: annotate immediately from whatever is cached.
    await annotate(countyId, countyName);

    // Step 4: refresh anything missing/stale in the background.
    void Promise.all(requiredIds.map((id) => ensureFetched(id))).then(() =>
      annotate(countyId, countyName),
    );

    // Step 5: react to any tab updating a required list.
    const requiredKeys = new Set(requiredIds.map((id) => `list:${id.region}:${id.period}`));
    onStorageChanged((changes) => {
      const relevant = Object.keys(changes).some((key) => requiredKeys.has(key));
      if (relevant) void annotate(countyId, countyName);
    });
  },
};
