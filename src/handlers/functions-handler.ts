import { Tor } from 'tor-control-ts';

import {
  ACCOUNTS,
  CONFIG,
  LOCALHOST,
  MAX_BATCHES,
  MESSAGE,
  SCREEN,
} from '../constants';
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
            proxy:
              this.__proxies[Math.floor(Math.random() * this.__proxies.length)],
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
      isPublic: true,
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
      displayName: CONFIG.nickname,
    });
  };

  private __raidAllRooms = async (meshes: Mesh[]) => {
    const contextBatches: Context[][] = [];

    for (let i = 0; i < meshes.length; i++) {
      const accountsPerMesh = Math.floor(
        this.__contexts.length / meshes.length,
      );
      const startIndex = i * accountsPerMesh;
      const endIndex = startIndex + accountsPerMesh;
      const batch = this.__contexts.slice(startIndex, endIndex);
      contextBatches.push(batch);
    }

    const promises: Promise<void>[] = [];

    for (let i = 0; i < meshes.length; i++) {
      const mesh = meshes[i];
      const contextBatch = contextBatches[i];

      const worker = async () => {
        const tasks = contextBatch.map((context) => ({
          context,
          meshId: mesh.id,
        }));

        await pool(
          tasks,
          async (task) => {
            try {
              await raidAllRoomsCallback(task.context, {
                meshId: task.meshId,
                message: MESSAGE,
              });
            } catch {}
          },
          Math.min(MAX_BATCHES.callbacks, contextBatch.length),
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

    const executeTask = async () => {
      await this.__processTask(sendFriendshipCallback, { userIds });
      setTimeout(executeTask, 1000);
    };

    await executeTask();
  };

  private __globalDestruction = async () => {
    const meshesData = await this.__getMeshes();

    await Promise.all([
      this.__raidAllRooms(meshesData.flatMap((meshData) => meshData.mesh)),
      this.__raidFriends(meshesData.flatMap((meshData) => meshData.users)),
    ]);
  };

  private __raidRoomsByLink = async (links: string[]) => {
    const meshesData: { mesh: Mesh; users: User[] }[] = [];

    await Promise.all(
      links.map(async (link) => {
        const mesh = await this.__rave?.mesh.getByLink(link);
        if (mesh) {
          meshesData.push({ mesh: mesh.data, users: mesh.data.users });
        }
      }),
    );

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
      case 'raidRoomsByLink': {
        const links = await buildInput(SCREEN.locale.enters.enterLinks);
        await this.__raidRoomsByLink(links.split(' '));
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
