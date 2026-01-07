import { SCREEN, SEND_MESSAGE_DELAY } from '../constants';
import { CallbackArgs } from '../schemas/callback';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';
import { generateRandomString } from './helpers';

export const changeProfileCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  context.instance.offProxy();
  const { displayName, displayAvatar } = args;

  try {
    await context.instance.user.edit({ displayName, displayAvatar });
    display(SCREEN.locale.logs.profileChanged, [context.instance.token]);
  } catch {
    display(SCREEN.locale.errors.profileChangeFailed, [context.instance.token]);
  }
};

export const raidAllRoomsCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  context.instance.proxy = context.proxy;
  const meshSocket = await context.instance.mesh.join(args.meshId);

  meshSocket.onopen(() => {
    setInterval(() => {
      meshSocket.sendMessage(
        `${generateRandomString()} ${args.message} ${generateRandomString()}`,
      );
    }, SEND_MESSAGE_DELAY);
  });
};

export const sendFriendshipCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  try {
    context.instance.offProxy();
    for (const userId of args.userIds) {
      await context.instance.user.sendFriendship(userId);
      display(SCREEN.locale.logs.friendshipSent, [context.instance.token]);
    }
  } catch {
    display(SCREEN.locale.errors.friendshipSendFailed, [
      context.instance.token,
    ]);
  }
};
