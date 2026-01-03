import z from 'zod';

import { ChoiceSchema } from './inquirer';

export const LocaleSchema = z.object({
  logo: z.string(),
  logoCredit: z.string(),
  enters: z.object({
    chooseAction: z.string(),
  }),
  choices: z.object({
    main: z.array(ChoiceSchema),
  }),
});

export type Locale = z.infer<typeof LocaleSchema>;
