import z from 'zod';

import { ChoiceSchema } from './inquirer';

export const LocaleSchema = z.object({
  logo: z.string(),
  logoCredit: z.string(),
  enters: z.object({
    chooseAction: z.string(),
    chooseLanguage: z.string(),
    chooseSettings: z.string(),
    enterTorPassword: z.string(),
    chooseFunction: z.string(),
    enterNickname: z.string(),
  }),
  errors: z.object({
    couldntFindTorrc: z.string(),
    torConnectionFailed: z.string(),
    proxyConnectionFailed: z.string(),
    contextCreationFailed: z.string(),
    profileChangeFailed: z.string(),
  }),
  logs: z.object({
    torConfigured: z.string(),
    torConnected: z.string(),
    proxyConnected: z.string(),
    allProxiesConnected: z.string(),
    contextCreated: z.string(),
    allContextsCreated: z.string(),
    profileChanged: z.string(),
  }),
  choices: z.object({
    main: z.array(ChoiceSchema),
    functions: z.array(ChoiceSchema),
    settings: z.array(ChoiceSchema),
    languages: z.array(ChoiceSchema),
  }),
});

export type Locale = z.infer<typeof LocaleSchema>;
