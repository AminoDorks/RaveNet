import { Cache, CacheSchema } from './schemas/cache';
import { load } from './utils/loaders';

const PATHS = {
  cache: '../cache.json',
};

export const ACCOUNTS = [...load<Cache>(PATHS.cache, CacheSchema).accounts];
