import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  site: 'https://xiaoxin-ai-0v0.github.io',
  base: '/xiaoxin-home',
});
