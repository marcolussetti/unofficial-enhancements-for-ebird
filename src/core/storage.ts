import type { Browser } from 'wxt/browser';
import { browser } from './browser';

export type Period = 'life' | 'year';

export interface ListCache {
  region: string;
  regionName?: string;
  period: Period;
  year?: number;
  fetchedAt: number | null;
  speciesCodes: string[];
  lastError?: string;
  lastErrorAt?: number;
}

export interface FeatureSetting {
  enabled: boolean;
}

export interface Settings {
  features: Record<string, FeatureSetting>;
  /** list-markers: highlight the whole row with a faint status colour. Off by default. */
  highlightRows: boolean;
}

export function listKey(region: string, period: Period): string {
  return `list:${region}:${period}`;
}

export function lockKey(region: string, period: Period): string {
  return `lock:${region}:${period}`;
}

export const SETTINGS_KEY = 'settings';

export async function storageGet<T>(key: string): Promise<T | undefined> {
  const result = await browser.storage.local.get(key);
  return result[key] as T | undefined;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}

export async function storageRemove(keys: string | string[]): Promise<void> {
  await browser.storage.local.remove(keys);
}

export async function storageGetAll(): Promise<Record<string, unknown>> {
  return browser.storage.local.get(null);
}

export function onStorageChanged(
  callback: (changes: Record<string, Browser.storage.StorageChange>) => void,
): () => void {
  const listener = (
    changes: Record<string, Browser.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local') return;
    callback(changes);
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
