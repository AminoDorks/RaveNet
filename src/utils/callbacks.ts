import { MAX_BATCHES, SCREEN } from '../constants';
import { CallbackArgs } from '../schemas/callback';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';
import { delay, generateRandomString } from './helpers';
import { pool } from './tasks';

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

export const raidRoomCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  context.instance.proxy = context.proxy;
  try {
    const meshSocket = await context.instance.mesh.join(args.meshId);

    meshSocket.onopen(() => {
      display(SCREEN.locale.logs.connectedToMesh, [context.instance.token]);
      setInterval(() => {
        meshSocket.sendMessage(
          `${generateRandomString()} ${args.message} ${generateRandomString()}`,
        );
        display(SCREEN.locale.logs.messageSent, [context.instance.token]);
      }, args.interval);
    });

    meshSocket.onerror(async () => {});
  } catch {}
};

export const sendFriendshipCallback = async (
  context: Context,
  args: CallbackArgs,
) => {
  try {
    context.instance.offProxy();
    await pool<number>(
      args.userIds,
      async (userId: number) => {
        await context.instance.user.sendFriendship(userId);
        display(SCREEN.locale.logs.friendshipSent, [context.instance.token]);
      },
      MAX_BATCHES.callbacks,
    );
  } catch {
    display(SCREEN.locale.errors.friendshipSendFailed, [
      context.instance.token,
    ]);
  }
};

export const setRandomNicknameCallback = async (
  context: Context,
  _: CallbackArgs,
) => {
  context.instance.offProxy();
  try {
    await context.instance.user.edit({ displayName: generateRandomString() });
    display(SCREEN.locale.logs.profileChanged, [context.instance.token]);
  } catch {
    display(SCREEN.locale.errors.profileChangeFailed, [context.instance.token]);
  }
};
