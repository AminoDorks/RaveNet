import { Tor } from 'tor-control-ts';
import { readFileSync } from 'fs';

import { ACCOUNTS, CONFIG, LOCALHOST, MAX_BATCHES, SCREEN } from '../constants';
import { Handler } from '../interfaces/handler';
import { buildInput, buildSelect, fileFilter } from '../ui/inquirer';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';
import { contextsToBatches, delay, setTorPassword } from '../utils/helpers';
import { pool, poolBatch } from '../utils/tasks';
import { Rave } from 'ravejs';
import { Account } from '../schemas/cache';
import { poolProxies } from '../utils/pools';
import { MeshHandler } from './mesh-handler';
import { MeshesTotal } from '../schemas/mesh-data';
import {
  changeProfileCallback,
  raidRoomCallback,
  sendFriendshipCallback,
  setRandomNicknameCallback,
} from '../utils/callbacks';

export class FunctionsHandler implements Handler {
  private __tor?: Tor;
  private __rave?: Rave;
  private __meshHandler?: MeshHandler;
  private __proxies: string[] = [];
  private __contexts: Context[] = [];

  private __totalToUsers = async (total: MeshesTotal): Promise<number[]> => {
    const botIds = this.__contexts.map(
      (context) => context.instance.account.id,
    );
    return total.users
      .map((user) => user.id)
      .filter((id) => !botIds.includes(id));
  };

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

  private __setupData = async (): Promise<void> => {
    await this.__tor?.signalNewnym();
    this.__proxies = await poolProxies();

    this.__contexts = [];
    SCREEN.displayLogo();

    await poolBatch(
      this.__proxies,
      ACCOUNTS,
      MAX_BATCHES.accounts,
      async (proxy: string, accounts: Account[]) => {
        for (const account of accounts) {
          const instance = new Rave();
          try {
            await instance.auth.authenticate(account.token, account.deviceId);
            display(SCREEN.locale.logs.contextCreated, [account.token]);
          } catch {
            display(SCREEN.locale.errors.contextCreationFailed, [
              account.token,
            ]);
            await delay(1);
            return;
          }

          this.__contexts.push({
            instance,
            proxy,
          });
        }
      },
    );

    if (!this.__contexts.length) {
      display(SCREEN.locale.errors.totalContextCreationFailed);
      await delay(1);
    }

    this.__rave = this.__contexts[0].instance;
  };

  private __handleMeshes = async (): Promise<MeshesTotal> => {
    const meshesData = await this.__meshHandler!.handle();

    return {
      meshes: meshesData.flatMap((meshData) => meshData.mesh),
      users: meshesData.flatMap((meshData) => meshData.users),
    };
  };

  private __changeProfile = async (): Promise<void> => {
    const displayAvatar = await this.__contexts[0].instance.user.uploadAvatar(
      readFileSync(
        await buildInput(SCREEN.locale.enters.enterAvatarPath, {
          filter: fileFilter,
        }),
      ),
    );
    const displayName = await buildInput(SCREEN.locale.enters.enterNickname);

    await pool<Context>(
      this.__contexts,
      changeProfileCallback,
      MAX_BATCHES.callbacks,
      {
        displayAvatar,
        displayName,
      },
    );
  };

  private __raidFriends = async (userIds: number[]) => {
    while (true) {
      await pool<Context>(
        this.__contexts,
        sendFriendshipCallback,
        MAX_BATCHES.callbacks,
        { userIds },
      );
      await delay(1);
    }
  };

  private __raidAllRooms = async (meshIds: string[], message: string) => {
    const contextBatches = contextsToBatches(this.__contexts, meshIds);
    const promises: Promise<void>[] = [];
    console.log(contextBatches[0].length);

    for (let i = 0; i < meshIds.length; i++) {
      const worker = async () => {
        await pool(
          contextBatches[i].map((context) => ({
            context,
            meshId: meshIds[i],
          })),
          async (task) => {
            await raidRoomCallback(task.context, {
              meshId: task.meshId,
              message,
            });
          },
          MAX_BATCHES.callbacks,
        );
      };
      promises.push(worker());
    }

    await Promise.all(promises);
  };

  private __exterminatus = async () => {
    const total = await this.__handleMeshes();
    await pool<Context>(
      this.__contexts,
      setRandomNicknameCallback,
      MAX_BATCHES.callbacks,
    );

    await Promise.all([
      this.__raidAllRooms(
        total.meshes.map((mesh) => mesh.id),
        await buildInput(SCREEN.locale.enters.enterMessage),
      ),
      this.__raidFriends(total.users.map((user) => user.id)),
    ]);
  };

  async handle(): Promise<void> {
    if (!CONFIG.torPassword) {
      await setTorPassword();
    }

    if (!this.__tor) {
      await this.__torSetup();
      await this.__setupData();
    }
    this.__meshHandler = new MeshHandler(
      this.__rave || this.__contexts[0].instance,
    );

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
      case 'exterminatus': {
        await this.__exterminatus();
        break;
      }
      case 'raidAllRooms': {
        await this.__raidAllRooms(
          (await this.__handleMeshes()).meshes.map((mesh) => mesh.id),
          await buildInput(SCREEN.locale.enters.enterMessage),
        );
        break;
      }
      case 'raidFriends': {
        await this.__raidFriends(
          await this.__totalToUsers(await this.__handleMeshes()),
        );
        break;
      }
      case 'changeProfile': {
        await this.__changeProfile();
        break;
      }
      case 'updateProxies': {
        await this.__setupData();
        break;
      }
    }
  }
}
