import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  base: '/xiaoxin-home',
  trailingSlash: 'always',
});
