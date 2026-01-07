import z from 'zod';

import { Context } from './context';

export const ArgsSchema = z.record(z.string(), z.any());

export type CallbackArgs = z.infer<typeof ArgsSchema>;
export type FunctionCallback = (
  context: Context,
  args: CallbackArgs,
) => Promise<void>;
