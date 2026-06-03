import { defineCollection, z } from 'astro:content';

const tutorials = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    feature: z.enum(['expenses', 'wishlists', 'birthdays', 'games', 'general']),
    updatedDate: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('EvenJar'),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { tutorials, blog };
