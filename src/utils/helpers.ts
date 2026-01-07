import { existsSync, readFileSync } from 'fs';

import { CONFIG, PATHS, SCREEN, TORRC_PATHS } from '../constants';
import { display } from '../ui/screen';
import { save } from './loaders';

export const delay = async (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const findTorrc = (): string | undefined => {
  let torrcContent: string | undefined;

  const paths =
    process.platform == 'win32' ? TORRC_PATHS.win : TORRC_PATHS.unix;
  const validPaths = paths.filter((path) => existsSync(path));

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

export const configureTor = () => {
  const torrc = findTorrc();

  if (!torrc) {
    display(SCREEN.locale.errors.couldntFindTorrc);
    return;
  }

  CONFIG.torPort = findTorControlPort(torrc);
  CONFIG.proxies = findTorSocksPorts(torrc);
  save(PATHS.config, CONFIG);

  display(SCREEN.locale.logs.torConfigured);
};

export const generateRandomString = () =>
  Math.random().toString(36).substring(2);
