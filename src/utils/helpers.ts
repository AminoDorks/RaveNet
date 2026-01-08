import { existsSync, readFileSync } from 'fs';

import { CONFIG, PATHS, SCREEN, TORRC_PATHS } from '../constants';
import { display } from '../ui/screen';
import { save } from './loaders';
import { buildInput } from '../ui/inquirer';

export const delay = async (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const findTorrc = (customPath?: string): string | undefined => {
  let torrcContent: string | undefined;

  const paths = customPath
    ? [customPath]
    : process.platform == 'win32'
      ? TORRC_PATHS.win
      : TORRC_PATHS.unix;
  const validPaths = paths.filter((path) => existsSync(path));
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
    torrc = findTorrc(CONFIG.customPath);
  } else {
    torrc = findTorrc();
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
