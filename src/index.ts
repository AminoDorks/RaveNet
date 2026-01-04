import { SCREEN } from './constants';
import { configureTor, delay } from './utils/helpers';

(async () => {
  SCREEN.displayLogo();
  configureTor();
  await delay(3);

  await SCREEN.run();
})();
