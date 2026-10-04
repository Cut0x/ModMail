const en = require('./locales/en');
const fr = require('./locales/fr');

const LOCALES = { en, fr };
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = Object.keys(LOCALES);
const LOCALE_NAMES = { en: 'English', fr: 'Français' };
const LOCALE_SETTING_KEY = 'locale';

let currentLocale = DEFAULT_LOCALE;

const getPath = (object, path) => path.split('.').reduce((acc, part) => acc?.[part], object);

const interpolate = (template, params) => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in params ? String(params[key]) : match));
};

const t = (key, params) => {
  const value = getPath(LOCALES[currentLocale], key) ?? getPath(LOCALES[DEFAULT_LOCALE], key);

  if (value === undefined) {
    console.warn(`Missing i18n key: ${key}`);
    return key;
  }

  if (Array.isArray(value)) return value.map((line) => interpolate(line, params));

  return interpolate(value, params);
};

const getLocale = () => currentLocale;

const loadLocale = (db) => {
  const stored = db.getSetting(LOCALE_SETTING_KEY);
  currentLocale = SUPPORTED_LOCALES.includes(stored) ? stored : DEFAULT_LOCALE;
  return currentLocale;
};

const setLocale = async (db, locale) => {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    throw new Error(`Unsupported locale: ${locale}`);
  }

  await db.setSetting(LOCALE_SETTING_KEY, locale);
  currentLocale = locale;
  return currentLocale;
};

module.exports = {
  t,
  getLocale,
  loadLocale,
  setLocale,
  SUPPORTED_LOCALES,
  LOCALE_NAMES,
  DEFAULT_LOCALE,
};
