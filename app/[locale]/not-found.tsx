import { Compass } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60svh] flex-col items-center justify-center py-section text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary">
        <Compass className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <p className="mt-8 font-display text-6xl font-semibold text-muted-foreground/40">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
      <p className="mt-4 max-w-md text-muted-foreground">The page you are looking for does not exist or has moved.</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
