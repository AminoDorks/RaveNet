import { Rave } from 'ravejs';

import { CONFIG, MAX_BATCHES, SCREEN } from '../constants';
import { pool } from './tasks';
import { display } from '../ui/screen';
import { delay } from './helpers';

export const poolProxies = async (): Promise<string[]> => {
  const proxies: string[] = [];

  await pool<string>(
    CONFIG.proxies,
    async (proxy: string) => {
      const rave = new Rave();
      rave.proxy = proxy;

      if (await rave.proxyIsAlive()) {
        proxies.push(proxy);
        rave.offProxy();
        display(SCREEN.locale.logs.proxyConnected, [proxy]);

        return;
      }

      display(SCREEN.locale.errors.proxyConnectionFailed, [proxy]);
    },
    MAX_BATCHES.proxy,
  );

  if (!proxies.length) {
    display(SCREEN.locale.errors.totalProxyConnectionFailed);
    await delay(1);
  }

  return proxies;
};
