/**
 * i18n foundation (spec §13.3). English is the only bundled UI locale for v1;
 * additional launch locales (es/fr/de/pt) drop into `locales/` and get added to
 * `resources` later. Plurals use i18next's built-in CLDR rules (Intl.PluralRules),
 * which cover every launch locale; ICU MessageFormat can be layered via
 * `i18next-icu` if richer formatting is ever needed.
 *
 * The in-game word language is independent of this UI language (spec §3). Init
 * is synchronous (resources are bundled) so `useTranslation()` works on first
 * render — `react: { useSuspense: false }` keeps RN off React Suspense.
 *
 * Layout stays RTL-safe by construction: use `start`/`end` (not left/right) and
 * row layouts that flip with the writing direction; no UI locale ships RTL yet.
 */

import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const resources = { en: { translation: en } } as const;

export type AppLocale = keyof typeof resources;

/** The device UI language if we ship it, else English. */
function initialLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode;
  return code && code in resources ? (code as AppLocale) : 'en';
}

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member -- i18n.use() is i18next's chaining init API, not the named `use` export
  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React Native escapes by default; no XSS surface.
    returnNull: false,
    react: { useSuspense: false },
  });
}

export default i18n;
