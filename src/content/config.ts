import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    category: z.enum(['技术', '生活', '随笔']),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    category: z.enum(['AI', 'Web', 'Game', 'Tool']),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    demoUrl: z.string().url().optional(),
    repoUrl: z.string().url().optional(),
    cover: z.string().optional(),
  }),
});

export const collections = { blog, projects };
