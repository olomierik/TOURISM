import type { Instrumentation } from 'next';

/**
 * Server errors are reported, not just logged (lib/monitoring/report-error.ts).
 *
 * Imported lazily and only on the Node runtime: the reporter uses the mailer
 * and the service client, neither of which belongs in the edge bundle.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { reportServerError } = await import('@/lib/monitoring/report-error');
  const error = err as Error & { digest?: string };
  await reportServerError({
    message: error?.message ?? String(err),
    digest: error?.digest,
    stack: error?.stack,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
