import z from 'zod';

export const AccountSchema = z.object({
  email: z.string(),
  token: z.string(),
  deviceId: z.string(),
});

export const CacheSchema = z.object({
  accounts: z.array(AccountSchema),
});

export type Account = z.infer<typeof AccountSchema>;
export type Cache = z.infer<typeof CacheSchema>;
