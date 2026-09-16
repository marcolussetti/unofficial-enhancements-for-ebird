import { browser } from '../../src/core/browser';
import { features } from '../../src/core/registry';
import { loadSettings, saveSettings } from '../../src/core/settings';
import { storageGetAll, storageRemove, type ListCache } from '../../src/core/storage';
import './style.css';

const EBIRD_ORIGIN = 'https://ebird.org/*';

function relativeTime(ms: number | null | undefined): string {
  if (!ms) return 'never';
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}d ago`;
}

async function renderFeatures(): Promise<void> {
  const settings = await loadSettings();
  const container = document.getElementById('features-list')!;
  container.innerHTML = '';

  for (const feature of features) {
    const row = document.createElement('label');
    row.className = 'uee-feature-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = settings.features[feature.id]?.enabled ?? feature.defaultEnabled;
    checkbox.addEventListener('change', async () => {
      const current = await loadSettings();
      current.features[feature.id] = { enabled: checkbox.checked };
      await saveSettings(current);
    });

    const text = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = feature.name;
    const desc = document.createElement('div');
    desc.className = 'uee-feature-desc';
    desc.textContent = feature.description;
    text.appendChild(name);
    text.appendChild(desc);

    row.appendChild(checkbox);
    row.appendChild(text);
    container.appendChild(row);
  }
}

async function getListCaches(): Promise<ListCache[]> {
  const all = await storageGetAll();
  const lists: ListCache[] = [];
  for (const [key, value] of Object.entries(all)) {
    if (key.startsWith('list:')) lists.push(value as ListCache);
  }
  lists.sort((a, b) => a.region.localeCompare(b.region) || a.period.localeCompare(b.period));
  return lists;
}

async function renderLists(): Promise<void> {
  const lists = await getListCaches();
  const body = document.getElementById('lists-table-body')!;
  body.innerHTML = '';

  for (const list of lists) {
    const tr = document.createElement('tr');

    const regionCell = document.createElement('td');
    regionCell.textContent = list.regionName ? `${list.regionName} (${list.region})` : list.region;

    const periodCell = document.createElement('td');
    periodCell.textContent = list.period === 'year' ? `year (${list.year ?? '?'})` : 'life';

    const countCell = document.createElement('td');
    countCell.textContent = String(list.speciesCodes.length);

    const refreshedCell = document.createElement('td');
    refreshedCell.textContent = relativeTime(list.fetchedAt);

    const errorCell = document.createElement('td');
    errorCell.textContent = list.lastError ? `${list.lastError} (${relativeTime(list.lastErrorAt)})` : '—';

    tr.append(regionCell, periodCell, countCell, refreshedCell, errorCell);
    body.appendChild(tr);
  }
}

async function checkFirefoxPermission(): Promise<void> {
  if (!browser.permissions?.contains) return;
  const section = document.getElementById('firefox-permission-section')!;
  const granted = await browser.permissions.contains({ origins: [EBIRD_ORIGIN] });
  section.hidden = granted;
}

function wireActions(): void {
  document.getElementById('refresh-btn')!.addEventListener('click', async () => {
    const lists = await getListCaches();
    await Promise.all(
      lists.map((list) =>
        browser.storage.local.set({
          [`list:${list.region}:${list.period}`]: { ...list, fetchedAt: null },
        }),
      ),
    );
    await renderLists();
  });

  document.getElementById('clear-btn')!.addEventListener('click', async () => {
    const all = await storageGetAll();
    const keys = Object.keys(all).filter((k) => k.startsWith('list:') || k.startsWith('lock:'));
    await storageRemove(keys);
    await renderLists();
  });

  document.getElementById('grant-permission-btn')!.addEventListener('click', async () => {
    const granted = await browser.permissions.request({ origins: [EBIRD_ORIGIN] });
    if (granted) await checkFirefoxPermission();
  });
}

async function init(): Promise<void> {
  await renderFeatures();
  await renderLists();
  await checkFirefoxPermission();
  wireActions();
}

void init();
