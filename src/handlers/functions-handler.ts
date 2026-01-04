import { Tor } from 'tor-control-ts';

import { ACCOUNTS, CONFIG, LOCALHOST, MAX_BATCHES, SCREEN } from '../constants';
import { Handler } from '../interfaces/handler';
import { buildInput, buildSelect } from '../ui/inquirer';
import { Context } from '../schemas/context';
import { display } from '../ui/screen';
import { delay } from '../utils/helpers';
import { batchPool, pool } from '../utils/tasks';
import { Rave } from 'ravejs';
import { Account } from '../schemas/cache';
import { CallbackArgs, FunctionCallback } from '../schemas/callback';
import { changeProfileCallback } from '../utils/callbacks';

export class FunctionsHandler implements Handler {
  private __tor?: Tor;
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
          const instance = new Rave({
            credentials: {
              token: account.token,
              deviceId: account.deviceId,
            },
          });
          try {
            await instance.getAccount();
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
        await this.__processTask(changeProfileCallback, {
          nickname: await buildInput(SCREEN.locale.enters.enterNickname),
        });
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
