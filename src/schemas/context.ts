import { Rave } from 'ravejs';
import z from 'zod';

export const ContextSchema = z.object({
  instance: z.instanceof(Rave),
  proxy: z.string(),
});

export type Context = z.infer<typeof ContextSchema>;
