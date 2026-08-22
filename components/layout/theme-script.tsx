/**
 * Applies the stored theme before first paint.
 *
 * Runs blocking in <head> on purpose: any async approach lets the light palette
 * paint first, and a white flash on a dark-mode travel site with full-bleed
 * photography is jarring enough that users notice it every single navigation.
 */
export function ThemeScript() {
  const script = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var isDark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {}
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
