import { existsSync, readFileSync } from 'fs';

import { CONFIG, PATHS, SCREEN, TORRC_PATHS } from '../constants';
import { display } from '../ui/screen';
import { save } from './loaders';
import { buildInput } from '../ui/inquirer';
import { Context } from '../schemas/context';

export const readSplitLines = (path: string): string[] => {
  const lines = readFileSync(path, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.replace(/\r/g, ''));

  return Array.from(new Set(lines));
};

export const delay = async (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const findTorrc = async (customPath?: string): Promise<string | undefined> => {
  let torrcContent: string | undefined;

  const paths = customPath
    ? [customPath]
    : process.platform == 'win32'
      ? TORRC_PATHS.win
      : TORRC_PATHS.unix;
  const validPaths = paths.filter((path) => existsSync(path));

  if (!validPaths.length) {
    validPaths.push(await buildInput(SCREEN.locale.enters.enterTorPath));
  }

  CONFIG.customPath = validPaths[0];
  save(PATHS.config, CONFIG);

  try {
    torrcContent = readFileSync(validPaths[0], 'utf-8').toString();
  } catch (error) {}

  return torrcContent;
};

const findTorSocksPorts = (content: string): string[] => {
  const matches = content.match(/SocksPort\s+(\d+)/g);
  return matches
    ? matches.map((match) => `socks5://127.0.0.1:${match.split(' ')[1]}`)
    : [];
};

const findTorControlPort = (content: string) => {
  const matches = content.match(/ControlPort\s+(\d+)/g);
  return matches ? parseInt(matches[0].split(' ')[1]) : CONFIG.torPort;
};

export const configureTor = async () => {
  let torrc;

  if (CONFIG.customPath) {
    torrc = await findTorrc(CONFIG.customPath);
  } else {
    torrc = await findTorrc();
  }

  if (!torrc) {
    display(SCREEN.locale.errors.couldntFindTorrc);
    process.exit(1);
  }

  CONFIG.torPort = findTorControlPort(torrc);
  CONFIG.proxies = findTorSocksPorts(torrc);
  save(PATHS.config, CONFIG);

  display(SCREEN.locale.logs.torConfigured);
};

export const generateRandomString = () =>
  Math.random().toString(36).substring(2);

export const setTorPassword = async () => {
  const password = await buildInput(SCREEN.locale.enters.enterTorPassword, {
    defaultAnswer: CONFIG.torPassword,
  });

  CONFIG.torPassword = password;
  save(PATHS.config, CONFIG);
};

export const contextsToBatches = (
  contexts: Context[],
  meshIds: string[],
): Context[][] => {
  const contextBatches: Context[][] = [];

  for (let i = 0; i < meshIds.length; i++) {
    const accountsPerMesh = Math.floor(contexts.length / meshIds.length);
    const startIndex = i * accountsPerMesh;
    const batch = contexts.slice(startIndex, startIndex + accountsPerMesh);
    contextBatches.push(batch);
  }

  return contextBatches;
};
