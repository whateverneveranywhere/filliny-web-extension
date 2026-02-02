import { t as t_dev_or_prod } from './i18n.js';
import type { MessageKeyType } from './types.js';

/** Translation function type that works in both dev and production builds */
type TranslationFn = (key: MessageKeyType, substitutions?: string | string[]) => string;

export const t: TranslationFn = t_dev_or_prod;
