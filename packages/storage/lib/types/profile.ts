export interface DTOFillingProfileItem {
  id: number;
  isActive: boolean;
  name: string;
}

export interface DTOSuggestedWebsite {
  label: string;
  value: string;
  id: number;
}
export interface DTOTone {
  label: string;
  value: string;
  id: number;
}
export interface DTOpov {
  label: string;
  value: string;
  id: number;
}

export interface DTOFillingWebsite {
  websiteUrl: string;
  isRootLoad: boolean;
  fillingContext: string;
}
export interface DTOFillingPrefrences {
  isFormal: boolean;
  isGapFillingAllowed: boolean;
  toneId: number;
  povId: number;
}
export interface DTOProfileFillingForm {
  id?: string | number;
  profileName: string;
  defaultFillingContext: string;
  preferences: DTOFillingPrefrences;
  fillingWebsites: DTOFillingWebsite[];
}
