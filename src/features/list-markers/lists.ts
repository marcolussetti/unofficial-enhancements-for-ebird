import {
  listKey,
  lockKey,
  storageGet,
  storageSet,
  storageRemove,
  type ListCache,
  type Period,
} from '../../core/storage';

export const STALE_MS = 4 * 60 * 60 * 1000; // 4 hours
export const LOCK_MS = 60 * 1000; // 60 seconds

export interface ListId {
  region: string; // "world" or an eBird region code
  period: Period;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export function listUrl(id: ListId): string {
  const time = id.period === 'life' ? 'life' : 'year';
  return `https://ebird.org/lifelist?r=${encodeURIComponent(id.region)}&time=${time}`;
}

export function isStale(cache: ListCache | undefined): boolean {
  if (!cache) return true;
  if (cache.fetchedAt === null) return true;
  if (cache.period === 'year' && cache.year !== currentYear()) return true;
  return Date.now() - cache.fetchedAt > STALE_MS;
}

export async function readListCache(id: ListId): Promise<ListCache | undefined> {
  return storageGet<ListCache>(listKey(id.region, id.period));
}

export async function writeListCache(cache: ListCache): Promise<void> {
  await storageSet(listKey(cache.region, cache.period), cache);
}

/**
 * Best-effort (not atomic) lock, per plan section 5.5.
 */
export async function acquireLock(id: ListId): Promise<boolean> {
  const key = lockKey(id.region, id.period);
  const existing = await storageGet<number>(key);
  if (existing !== undefined && Date.now() - existing < LOCK_MS) {
    return false;
  }
  await storageSet(key, Date.now());
  return true;
}

export async function releaseLock(id: ListId): Promise<void> {
  await storageRemove(lockKey(id.region, id.period));
}
