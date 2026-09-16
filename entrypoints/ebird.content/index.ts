import { features } from '../../src/core/registry';
import { isFeatureEnabled } from '../../src/core/settings';
import './style.css';

export default defineContentScript({
  matches: ['https://ebird.org/*'],
  runAt: 'document_idle',
  async main() {
    const url = new URL(location.href);
    for (const feature of features) {
      if (!feature.matches(url)) continue;
      if (!(await isFeatureEnabled(feature.id))) continue;
      try {
        await feature.run();
      } catch (e) {
        console.error(`[uee] feature "${feature.id}" failed`, e);
      }
    }
  },
});
