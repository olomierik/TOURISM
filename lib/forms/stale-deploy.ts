/**
 * A page opened before a deploy and submitted after it.
 *
 * Every deploy gives each server action a new id, so a form on a page loaded
 * from the old build asks the new server for an action it has never heard of
 * ("Failed to find Server Action. This request might be from an older or newer
 * deployment"). Nothing reached the action, so nothing was saved: the cure is
 * the new page, which app/[locale]/error.tsx loads.
 *
 * Reloading alone threw away whatever the visitor had typed, which on the
 * contact form is the whole message (production, 22 Nov 2026). So every form
 * is photographed just before it submits (components/forms/form-rescue.tsx),
 * and after a reload caused by this error the photograph is put back and the
 * visitor is told to press Send again.
 *
 * Browser-only. The snapshot lives in sessionStorage — this tab, this visit —
 * and is dropped once restored or after two minutes.
 */

import { unstable_isUnrecognizedActionError } from 'next/navigation';

export const RELOAD_KEY = 'et:stale-deploy-reload';
export const SNAPSHOT_KEY = 'et:form-snapshot';
/** How long a snapshot or a stale-deploy reload counts as "just now". */
export const FRESH_MS = 2 * 60_000;

const STALE_MESSAGE = /server action|older or newer deployment|failed to find/i;

export function isStaleDeployError(error: unknown): boolean {
  if (unstable_isUnrecognizedActionError(error)) return true;
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return STALE_MESSAGE.test(message);
}

/**
 * Loads the new build, once. A second stale failure within a minute returns
 * false instead of reloading, so a broken deploy shows an error rather than a
 * page that reloads forever.
 */
export function reloadForNewDeploy(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage blocked: reload anyway, the guard is only against a loop.
  }
  window.location.reload();
  return true;
}

/** True right after reloadForNewDeploy() brought this page back. */
export function reloadedForNewDeploy(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    return Date.now() - last < FRESH_MS;
  } catch {
    return false;
  }
}

/** Fields never written to storage: secrets, files, and the bot traps. */
export function skipField(el: Element): boolean {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
    return true;
  }
  if (!el.name || el.disabled) return true;
  if (el.name.startsWith('et_hp') || /token|password|secret|card/i.test(el.name)) return true;
  if (el instanceof HTMLInputElement && ['password', 'file', 'hidden', 'submit', 'button'].includes(el.type)) {
    return true;
  }
  return false;
}

export type FormSnapshot = {
  path: string;
  at: number;
  /** name -> values in document order; checkboxes record only the ticked ones. */
  fields: Record<string, string[]>;
};

export function snapshotForm(form: HTMLFormElement): FormSnapshot {
  const fields: Record<string, string[]> = {};
  for (const el of Array.from(form.elements)) {
    if (skipField(el)) continue;
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
      fields[input.name] ??= [];
      if (input.checked) fields[input.name].push(input.value);
      continue;
    }
    (fields[input.name] ??= []).push(input.value);
  }
  return { path: window.location.pathname, at: Date.now(), fields };
}

/** Sets a value the way typing would, so React's own state hears about it. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = Object.getPrototypeOf(el) as object;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

/** Writes a snapshot back into a form. Returns how many fields it filled. */
export function restoreForm(form: HTMLFormElement, snapshot: FormSnapshot): number {
  let filled = 0;
  const seen: Record<string, number> = {};
  for (const el of Array.from(form.elements)) {
    if (skipField(el)) continue;
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    const values = snapshot.fields[input.name];
    if (!values) continue;
    if (input instanceof HTMLInputElement && (input.type === 'checkbox' || input.type === 'radio')) {
      const want = values.includes(input.value);
      if (input.checked !== want) input.click();
      filled++;
      continue;
    }
    const i = seen[input.name] ?? 0;
    seen[input.name] = i + 1;
    const value = values[i];
    if (value === undefined || value === input.value) continue;
    setNativeValue(input, value);
    filled++;
  }
  return filled;
}

/** The form on the page that shares the most field names with the snapshot. */
export function matchForm(snapshot: FormSnapshot): HTMLFormElement | null {
  const names = new Set(Object.keys(snapshot.fields));
  let best: HTMLFormElement | null = null;
  let bestScore = 0;
  for (const form of Array.from(document.forms)) {
    let score = 0;
    for (const el of Array.from(form.elements)) {
      if (!skipField(el) && names.has((el as HTMLInputElement).name)) score++;
    }
    if (score > bestScore) {
      best = form;
      bestScore = score;
    }
  }
  return best;
}
