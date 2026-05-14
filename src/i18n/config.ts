import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../../public/locales/en/common.json";
import enNavigation from "../../public/locales/en/navigation.json";
import enDashboard from "../../public/locales/en/dashboard.json";
import enSettings from "../../public/locales/en/settings.json";
import ptCommon from "../../public/locales/pt/common.json";
import ptNavigation from "../../public/locales/pt/navigation.json";
import ptDashboard from "../../public/locales/pt/dashboard.json";
import ptSettings from "../../public/locales/pt/settings.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "pt",
    defaultNS: "common",
    ns: ["common", "dashboard", "navigation", "settings"],
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        dashboard: enDashboard,
        settings: enSettings,
      },
      pt: {
        common: ptCommon,
        navigation: ptNavigation,
        dashboard: ptDashboard,
        settings: ptSettings,
      },
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
