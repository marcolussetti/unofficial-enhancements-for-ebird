import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  outDir: 'dist',
  manifest: ({ browser }) => ({
    name: 'Unofficial enhancements for eBird',
    short_name: 'eBird Enhancements',
    description:
      'Adds life/year list status badges to species links on ebird.org. Not affiliated with eBird or the Cornell Lab of Ornithology.',
    permissions: ['storage'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'unofficial-ebird-enhancements@marcolussetti.com',
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  manifestVersion: 3,
});
