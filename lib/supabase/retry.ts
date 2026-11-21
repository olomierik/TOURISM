/**
 * One more try when the database says it was too busy.
 *
 * Anonymous reads are cancelled at three seconds (the anon role's
 * statement_timeout). The queries themselves take tens of milliseconds; they
 * time out only when many pages rebuild at once — a crawler walking the
 * directory, a sitemap refreshing — and the same request a moment later
 * succeeds. On 20–21 November 2026 that was 30 failed directory queries and a
 * sitemap that errored instead of serving.
 *
 * So a read that fails with PostgREST's statement-timeout error (57014), or a
 * gateway timeout, is sent again up to twice, after a short pause that grows.
 * Only reads: a write is never repeated, because a write that timed out may
 * still have happened.
 */
const RETRY_DELAYS_MS = [300, 900];

function isRead(init?: RequestInit): boolean {
  const method = (init?.method ?? 'GET').toUpperCase();
  return method === 'GET' || method === 'HEAD';
}

async function isTimeout(res: Response): Promise<boolean> {
  if (res.status === 503 || res.status === 504) return true;
  if (res.status !== 500) return false;
  try {
    const body = await res.clone().text();
    return body.includes('"57014"') || /statement timeout/i.test(body);
  } catch {
    return false;
  }
}

/**
 * The request options for a retry. Each attempt carries its own header so it
 * is a different request to Next's per-render fetch memoisation and data
 * cache, which would otherwise hand the retry the same failed response.
 */
export function retryInit(init: RequestInit | undefined, attempt: number): RequestInit | undefined {
  if (attempt === 0) return init;
  const headers = new Headers(init?.headers);
  headers.set('x-et-retry', String(attempt));
  return { ...init, headers };
}

export async function fetchRetryingTimeouts(
  doFetch: (attempt: number) => Promise<Response>,
  init?: RequestInit,
): Promise<Response> {
  let res = await doFetch(0);
  if (!isRead(init)) return res;
  for (const [i, delay] of RETRY_DELAYS_MS.entries()) {
    if (!(await isTimeout(res))) return res;
    await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
    res = await doFetch(i + 1);
  }
  if (await isTimeout(res)) console.warn('[supabase] read still timing out after retries');
  return res;
}
