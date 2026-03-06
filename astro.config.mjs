import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://xiaoxin-ai-0v0.github.io/xiaoxin-home/',
  integrations: [tailwind(), sitemap()],
  adapter: cloudflare(),
});