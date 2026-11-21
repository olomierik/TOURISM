'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';

import { switchBusiness } from '@/lib/dashboard/switch-business';
import { Select } from '@/components/ui/select';

/**
 * Shown only to an owner with more than one listing: which one the dashboard
 * is working on. Changing it switches every dashboard page.
 */
export function BusinessSwitcher({
  businesses,
  activeId,
}: {
  businesses: Array<{ id: string; name: string; status: string }>;
  activeId: string;
}) {
  const t = useTranslations('dashboard');
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={switchBusiness} className="flex items-center gap-2">
      <label htmlFor="business-switcher" className="text-body-sm font-medium text-muted-foreground">
        {t('switchListing')}
      </label>
      <Select
        id="business-switcher"
        name="businessId"
        defaultValue={activeId}
        onChange={() => form.current?.requestSubmit()}
        className="max-w-[16rem]"
      >
        {businesses.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
            {b.status !== 'approved' ? ` (${t(`status${b.status.charAt(0).toUpperCase()}${b.status.slice(1)}` as 'statusDraft')})` : ''}
          </option>
        ))}
      </Select>
      <noscript>
        <button type="submit">OK</button>
      </noscript>
    </form>
  );
}
