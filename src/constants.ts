import { Cache, CacheSchema } from './schemas/cache';
import { Screen } from './ui/screen';
import { readSplitLines } from './utils/helpers';
import { load } from './utils/loaders';

export const COLORS = {
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

export const PATHS = {
  cache: '../cache.json',
  proxies: '../proxies.txt',
  locales: '../locales/%s.json',
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

export const PROXIES = readSplitLines(PATHS.proxies);
export const ACCOUNTS = [...load<Cache>(PATHS.cache, CacheSchema).accounts];
export const SCREEN = new Screen('ru');
