import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const base = process.env.VERCEL ? '' : '/xiaoxin-home';

export default defineConfig({
  integrations: [tailwind()],
  base,
});
