import type { DEFAULT_CHOICES, MODULE_CONFIG } from './const.js';
import type { CliAction, WritableDeep } from '@extension/shared';
import type { select } from '@inquirer/prompts';

type ModuleConfigType = typeof MODULE_CONFIG;

/**
 * CLI action type derived from CliAction enum
 */
export type CliActionType = `${CliAction}`;

export type ChoiceType = (typeof DEFAULT_CHOICES)[number];
export type ChoicesType = ChoiceType[];
export type ModuleNameType = ChoiceType['value'] | 'devtools-panel';
export type InputConfigType = Parameters<typeof select>[0];
export type WritableModuleConfigValuesType<T extends keyof ModuleConfigType> = WritableDeep<ModuleConfigType[T]>;

export interface ICLIOptions {
  action: CliActionType;
  targets: ModuleNameType[];
}

export type CliEntriesType = [string, (string | number)[]][];
