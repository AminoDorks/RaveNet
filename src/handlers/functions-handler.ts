import { Tor } from 'tor-control-ts';

import { ACCOUNTS, CONFIG, LOCALHOST, MAX_BATCHES, SCREEN } from '../constants';
import { Handler } from '../interfaces/handler';
import {
  buildInput,
  buildSelect,
  fileFilter,
  numericFilter,
} from '../ui/inquirer';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';
import { delay } from '../utils/helpers';
import { batchPool, pool } from '../utils/tasks';
import { Rave } from 'ravejs';
import { Account } from '../schemas/cache';
import { CallbackArgs, FunctionCallback } from '../schemas/callback';
import {
  changeProfileCallback,
  raidAllRoomsCallback,
  sendFriendshipCallback,
} from '../utils/callbacks';
import { readFileSync } from 'fs';
import { Languages, Mesh, User } from 'ravejs/dist/schemas';

export class FunctionsHandler implements Handler {
  private __tor?: Tor;
  private __rave?: Rave;
  private __proxies: string[] = [];
  private __contexts: Context[] = [];

  private __torSetup = async (): Promise<Tor | undefined> => {
    try {
      this.__tor = new Tor({
        host: LOCALHOST,
        port: CONFIG.torPort,
        password: CONFIG.torPassword,
      });
      await this.__tor.connect();
      display(SCREEN.locale.logs.torConnected);

      return this.__tor;
    } catch {
      display(SCREEN.locale.errors.torConnectionFailed);
      await delay(1);
      return;
    }
  };

  private __contextsSetup = async (): Promise<void> => {
    this.__contexts = [];
    SCREEN.displayLogo();

    await batchPool<string, Account>(
      this.__proxies,
      ACCOUNTS,
      MAX_BATCHES.contexts,
      async (proxy: string, accounts: Account[]) => {
        for (const account of accounts) {
          const instance = new Rave();
          try {
            await instance.auth.authenticate(account.token, account.deviceId);
          } catch {
            display(SCREEN.locale.errors.contextCreationFailed, [
              account.email,
            ]);
            continue;
          }

          this.__contexts.push({
            proxy,
            sockets: {},
            instance,
          });

          display(SCREEN.locale.logs.contextCreated, [account.email]);
        }
      },
    );

    this.__rave = this.__contexts[0].instance;
  };

  private __proxySetup = async (): Promise<void> => {
    this.__proxies = [];

    await this.__tor?.signalNewnym();

    await pool<string>(
      CONFIG.proxies,
      async (proxy: string) => {
        const rave = new Rave();
        rave.proxy = proxy;

        if (await rave.proxyIsAlive()) {
          this.__proxies.push(proxy);
          rave.offProxy();
          display(SCREEN.locale.logs.proxyConnected, [proxy]);

          return;
        }

        display(SCREEN.locale.errors.proxyConnectionFailed, [proxy]);
      },
      MAX_BATCHES.proxy,
    );
  };

  private __processTask = async (
    callback: FunctionCallback,
    args: CallbackArgs = {},
  ) => {
    await pool<Context>(this.__contexts, callback, MAX_BATCHES.callbacks, args);
  };

  private __getMeshes = async () => {
    const meshes = await this.__rave!.mesh.getMany({
      limit: Number(
        await buildInput(SCREEN.locale.enters.enterMeshAmount, {
          filter: numericFilter,
        }),
      ),
      language: (await buildSelect(
        SCREEN.locale.enters.chooseMeshLocale,
        SCREEN.locale.choices.locales,
      )) as Languages,
    });

    return meshes.data;
  };

  private __changeProfile = async () => {
    const displayAvatar = await this.__rave!.user.uploadAvatar(
      readFileSync(
        await buildInput(SCREEN.locale.enters.enterAvatarPath, {
          filter: fileFilter,
        }),
      ),
    );

    await this.__processTask(changeProfileCallback, {
      displayAvatar,
      displayName: await buildInput(SCREEN.locale.enters.enterNickname),
    });
  };

  private __raidAllRooms = async (meshes: Mesh[]) => {
    const contextBatches: Context[][] = [];
    const accountsPerMesh = Math.floor(meshes.length / this.__contexts.length);
    const promises = [];

    for (let i = 0; i < meshes.length; i += accountsPerMesh) {
      contextBatches.push(this.__contexts.slice(i, i + accountsPerMesh));
    }

    for (const batch of contextBatches) {
      const worker = async () => {
        await pool<Context>(
          batch,
          raidAllRoomsCallback,
          MAX_BATCHES.callbacks,
          {
            meshId: meshes[contextBatches.indexOf(batch)].id,
          },
        );
      };

      promises.push(worker());
    }

    await Promise.all(promises);
  };

  private __raidFriends = async (rawUsers: User[]) => {
    const userIds = rawUsers
      .filter((user) => user.name != CONFIG.nickname)
      .map((user) => user.id);

    while (true) {
      await this.__processTask(sendFriendshipCallback, { userIds });
    }
  };

  private __globalDestruction = async () => {
    const meshesData = await this.__getMeshes();

    await Promise.all([
      this.__raidAllRooms(meshesData.flatMap((meshData) => meshData.mesh)),
      this.__raidFriends(meshesData.flatMap((meshData) => meshData.users)),
    ]);
  };

  async handle(): Promise<void> {
    if (!this.__tor) {
      await this.__torSetup();
      await this.__proxySetup();
      await this.__contextsSetup();
    }

    SCREEN.displayLogo();
    display(
      `${SCREEN.locale.logs.allProxiesConnected}: ${this.__proxies.length}`,
    );
    display(
      `${SCREEN.locale.logs.allContextsCreated}: ${this.__contexts.length}`,
    );

    const functionName = await buildSelect(
      SCREEN.locale.enters.chooseFunction,
      SCREEN.locale.choices.functions,
    );

    switch (functionName) {
      case 'changeProfile': {
        await this.__changeProfile();
        break;
      }
      case 'raidAllRooms': {
        const meshesData = await this.__getMeshes();
        await this.__raidAllRooms(
          meshesData.flatMap((meshData) => meshData.mesh),
        );
        break;
      }
      case 'raidFriends': {
        const meshesData = await this.__getMeshes();
        await this.__raidFriends(
          meshesData.flatMap((meshData) => meshData.users),
        );
        break;
      }
      case 'globalDestruction': {
        await this.__globalDestruction();
        break;
      }
      case 'updateProxy': {
        await this.__proxySetup();
        await this.__contextsSetup();
        break;
      }
    }
  }
}
