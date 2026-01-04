import { CONFIG, PATHS, SCREEN } from '../constants';
import { Handler } from '../interfaces/handler';
import { buildInput, buildSelect } from '../ui/inquirer';
import { save } from '../utils/loaders';

export class SettingsHandler implements Handler {
  private __languageCallback = async () => {
    const language = await buildSelect(
      SCREEN.locale.enters.chooseLanguage,
      SCREEN.locale.choices.languages,
    );

    CONFIG.locale = language;
    SCREEN.locale = language;
    save(PATHS.config, CONFIG);
  };

  private __torPasswordCallback = async () => {
    const password = await buildInput(SCREEN.locale.enters.enterTorPassword, {
      defaultAnswer: CONFIG.torPassword,
    });

    CONFIG.torPassword = password;
    save(PATHS.config, CONFIG);
  };

  async handle(): Promise<void> {
    const setting = await buildSelect(
      SCREEN.locale.enters.chooseSettings,
      SCREEN.locale.choices.settings,
    );

    switch (setting) {
      case 'changeLanguage': {
        await this.__languageCallback();
        break;
      }
      case 'changeTorPassword': {
        await this.__torPasswordCallback();
        break;
      }
    }
  }
}
