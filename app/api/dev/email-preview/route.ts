import { NextResponse, type NextRequest } from 'next/server';

import { renderBrandedEmail } from '@/lib/notifications/template';

/**
 * Renders a transactional email in the browser, for looking at.
 *
 * Email HTML is the one thing in this codebase that cannot be checked by
 * reading it. It is inline-styled tables written for renderers that predate
 * every layout technique the rest of the site uses, and the only way to know
 * whether it holds together is to look at it. Sending oneself a test message
 * for each change is slow enough that it stops happening.
 *
 * Development only. Guarded rather than deleted after use, because the next
 * person to touch the template will want it, and a route that returns 404 in
 * production is cheaper than one that has to be rewritten from memory.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const asText = searchParams.get('format') === 'text';

  const mail = renderBrandedEmail({
    heading: 'Confirm your email address',
    paragraphs: [
      'Welcome, Erick. One step left: confirm this address so we know it reaches you.',
      'Once confirmed you can save trips, send enquiries to operators, and manage a business listing.',
    ],
    action: {
      label: 'Confirm my email',
      url: 'https://www.exploretanzania.online/auth/confirm?token_hash=example&type=signup',
    },
    footnote:
      'This link can be used once and expires in 24 hours. If you did not create an account, ' +
      'you can ignore this message and nothing will happen.',
  });

  return new NextResponse(asText ? mail.text : mail.html, {
    headers: { 'Content-Type': asText ? 'text/plain; charset=utf-8' : 'text/html; charset=utf-8' },
  });
}
