import z from 'zod';

export const ConfigSchema = z.object({
  locale: z.string(),
  torPort: z.number(),
  torPassword: z.string(),
  proxies: z.array(z.string()),
  customPath: z.string(),
  excludedIds: z.array(z.number()),
});

export type Config = z.infer<typeof ConfigSchema>;
