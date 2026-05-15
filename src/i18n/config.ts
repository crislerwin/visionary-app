import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "../../public/locales/en/common.json";
import enDashboard from "../../public/locales/en/dashboard.json";
import enNavigation from "../../public/locales/en/navigation.json";
import ptCommon from "../../public/locales/pt/common.json";
import ptDashboard from "../../public/locales/pt/dashboard.json";
import ptNavigation from "../../public/locales/pt/navigation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "pt",
    defaultNS: "common",
    ns: ["common", "dashboard", "navigation"],
    resources: {
      en: {
        common: enCommon,
        navigation: enNavigation,
        dashboard: enDashboard,
      },
      pt: {
        common: ptCommon,
        navigation: ptNavigation,
        dashboard: ptDashboard,
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
