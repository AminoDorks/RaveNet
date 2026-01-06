import { SCREEN } from '../constants';
import { CallbackArgs } from '../schemas/callback';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';

export const changeProfileCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  context.instance.offProxy();
  try {
    await context.instance.user.edit({ displayName: args.nickname });
    display(SCREEN.locale.logs.profileChanged, [context.instance.token]);
  } catch {
    display(SCREEN.locale.errors.profileChangeFailed, [context.instance.token]);
  }
};

export const sendFriendshipCallback = async (
  context: Context,
  args: CallbackArgs,
) => {};
