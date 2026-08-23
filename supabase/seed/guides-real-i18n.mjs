import { de } from './guides-de.mjs';
import { fr } from './guides-fr.mjs';
import { it } from './guides-it.mjs';

/**
 * Translations of the real editorial guides, keyed by locale then by the `key`
 * field in guides-real.mjs.
 *
 * Split one file per language because these are long-form editorial documents,
 * not strings: a single combined file would be thousands of lines and every
 * translation change would touch it. One file per locale also means a language
 * can be added or revised without rebasing over the others.
 *
 * A guide may be translated into some locales and not others. The hreflang layer
 * advertises a locale only when a translation actually exists, so a partial set
 * degrades correctly rather than pointing search engines at pages that 404.
 */
export const guideTranslations = { de, fr, it };

/** Locales that have at least one translation, in routing order. */
export const translatedLocales = Object.keys(guideTranslations);
