import { homedir } from 'os';

import { FunctionsHandler, SettingsHandler } from './handlers';
import { Handler } from './interfaces/handler';
import { Cache, CacheSchema } from './schemas/cache';
import { Config, ConfigSchema } from './schemas/config';
import { Screen } from './ui/screen';
import { load, makeIfIsnt } from './utils/loaders';

export const MAX_BATCHES = {
  proxy: 35,
  contexts: 40,
  callbacks: 50,
  accounts: 20,
};

export const COLORS = {
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

export const PATHS = {
  cache: '../cache.json',
  config: '../config.json',
  proxies: '../proxies.txt',
  locales: '../locales/%s.json',
};

export const TORRC_PATHS = {
  win: [
    'C:/Tor Browser/Browser/TorBrowser/Data/Tor/torrc',
    'C:/Users/user/Desktop/Tor Browser/Browser/TorBrowser/Data/Tor/torrc',
  ],
  unix: [
    '/etc/tor/torrc',
    '/usr/local/etc/tor/torrc',
    '/etc/torrc',
    `${homedir()}/.tor/torrc`,
    `${homedir()}/torrc`,
  ],
};

export const CUSTOM_THEME = {
  prefix: {
    idle: `${COLORS.red}?${COLORS.reset}`,
    done: `${COLORS.red}✔${COLORS.reset}`,
  },
  style: {
    answer: (text: string) => COLORS.red + text + COLORS.reset,
    message: (text: string) => COLORS.reset + text,
    highlight: (text: string) => COLORS.red + text + COLORS.reset,
    description: (text: string) => COLORS.red + text + COLORS.reset,
    disabled: (text: string) => COLORS.red + text + COLORS.reset,
  },
};

export const HANDLERS: Record<string, Handler> = {
  functions: new FunctionsHandler(),
  settings: new SettingsHandler(),
};

export const ACCOUNTS = [...load<Cache>(PATHS.cache, CacheSchema).accounts];
export const CONFIG: Config = makeIfIsnt<Config>(
  PATHS.config,
  {
    locale: 'en',
    torPassword: '',
    torPort: 9,
    proxies: [],
    customPath: '',
  },
  ConfigSchema,
);
export const LOCALHOST = '127.0.0.1';
export const MESSAGES_INTERVAL = 1000;
export const SCREEN = new Screen(CONFIG.locale);
