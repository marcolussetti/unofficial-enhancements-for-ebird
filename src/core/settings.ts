import { SETTINGS_KEY, storageGet, storageSet, type Settings } from './storage';
import { features } from './registry';

export function defaultSettings(): Settings {
  const settingsFeatures: Settings['features'] = {};
  for (const feature of features) {
    settingsFeatures[feature.id] = { enabled: feature.defaultEnabled };
  }
  return { features: settingsFeatures };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await storageGet<Settings>(SETTINGS_KEY);
  const defaults = defaultSettings();
  if (!stored) return defaults;
  return {
    features: { ...defaults.features, ...stored.features },
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storageSet(SETTINGS_KEY, settings);
}

export async function isFeatureEnabled(featureId: string): Promise<boolean> {
  const settings = await loadSettings();
  return settings.features[featureId]?.enabled ?? false;
}
