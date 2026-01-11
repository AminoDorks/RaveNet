import z from 'zod';

import { MeshSchema, UserSchema } from 'ravejs/dist/schemas';

export const MeshDataSchema = z.object({
  mesh: MeshSchema,
  users: z.array(UserSchema),
});

export const MeshesTotal = z.object({
  meshes: z.array(MeshSchema),
  users: z.array(UserSchema),
});

export type MeshData = z.infer<typeof MeshDataSchema>;
export type MeshesTotal = z.infer<typeof MeshesTotal>;
