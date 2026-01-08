import { CallbackArgs } from '../schemas/callback';

export const pool = async <T>(
  props: T[],
  callback: (arg: T, additionalArgs: CallbackArgs) => Promise<void>,
  maxConcurrency: number,
  args: CallbackArgs = {},
) => {
  const queue = [...props];
  const promises: Promise<void>[] = [];

  for (let i = 0; i < Math.min(maxConcurrency, props.length); i++) {
    const worker = async () => {
      while (queue.length > 0) {
        const prop = queue.shift();
        if (prop != undefined) {
          await callback(prop, args);
        }
      }
    };
    promises.push(worker());
  }

  await Promise.all(promises);
};
