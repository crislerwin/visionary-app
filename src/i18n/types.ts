import "i18next";

export type Locale = "pt" | "en";

export const locales: Locale[] = ["pt", "en"];

export const localeNames: Record<Locale, string> = {
  pt: "Português",
  en: "English",
};

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: Record<string, string>;
      dashboard: Record<string, string>;
      navigation: Record<string, string>;
      settings: Record<string, string>;
    };
  }
}
