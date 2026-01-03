import { Cache, CacheSchema } from './schemas/cache';
import { readSplitLines } from './utils/helpers';
import { load } from './utils/loaders';

const PATHS = {
  cache: '../cache.json',
  proxies: '../proxies.txt',
};

export const PROXIES = readSplitLines(PATHS.proxies);

export const ACCOUNTS = [...load<Cache>(PATHS.cache, CacheSchema).accounts];
