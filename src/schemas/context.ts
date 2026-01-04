import { Rave } from 'ravejs';
import { MeshSocket } from 'ravejs/dist/core/mesh-socket';
import z from 'zod';

export const ContextSchema = z.object({
  instance: z.instanceof(Rave),
  proxy: z.string(),
  sockets: z.record(z.string(), z.instanceof(MeshSocket)),
});

export type Context = z.infer<typeof ContextSchema>;
