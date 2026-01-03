import z from 'zod';

export const ConfigSchema = z.object({
  locale: z.string(),
});

export type Config = z.infer<typeof ConfigSchema>;
