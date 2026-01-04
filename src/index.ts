import { SCREEN } from './constants';
import { configureTor, delay } from './utils/helpers';

(async () => {
  SCREEN.displayLogo();
  configureTor();
  await delay(1);

  await SCREEN.run();
})();
