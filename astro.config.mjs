import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

export default defineConfig({
  integrations: [tailwind()],
  base: isVercel ? '' : '/xiaoxin-home',
});
