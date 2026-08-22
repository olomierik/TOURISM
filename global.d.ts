import type { routing } from './i18n/routing';
import type messages from './messages/en.json';

/**
 * Makes t('...') keys autocomplete and fail the build when a key is missing or
 * renamed. English is the source of truth; the other catalogues must match its shape.
 */
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
