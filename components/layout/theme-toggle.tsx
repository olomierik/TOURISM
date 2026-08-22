'use client';

import { useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * The `dark` class on <html> is the source of truth — ThemeScript sets it before
 * first paint, so React must read it rather than own it. useSyncExternalStore is
 * the correct primitive for that: it subscribes to genuinely external state and
 * hydrates without the setState-in-effect cascade a useState mirror would cause.
 */
function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains('dark');

// The server cannot know the visitor's preference; the store syncs on hydration.
const getServerSnapshot = () => false;

export function ThemeToggle() {
  const t = useTranslations('nav');
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    // Mutating the class notifies the observer above, which re-renders this button.
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Private browsing or storage disabled — the toggle still works this session.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={t('toggleTheme')}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </Button>
  );
}
