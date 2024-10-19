export type ValueOf<T> = T[keyof T];

export enum WebappEnvs {
  LOCAL = 'local',
  DEV = 'dev',
  PROD = 'prod',
}
