'use client';

import { useState, useTransition } from 'react';

import { setFeePerPerson, settleFee } from '@/lib/fees/actions';
import { Button } from '@/components/ui/button';

export function SettleFee({ feeId }: { feeId: string }) {
  const [ref, setRef] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (outcome: 'paid' | 'waived') =>
    start(async () => {
      const r = await settleFee(feeId, outcome, ref);
      setMsg(r.success ? (outcome === 'paid' ? 'Marked paid.' : 'Waived.') : 'Failed.');
    });
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        value={ref}
        onChange={(e) => setRef(e.target.value)}
        placeholder="Payment reference / note"
        className="h-8 w-40 rounded-md border bg-background px-2 text-xs"
      />
      <Button size="sm" disabled={pending} onClick={() => run('paid')}>
        Paid
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('waived')}>
        Waive
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

export function FeeSetting({ amount, currency }: { amount: number; currency: string }) {
  const [value, setValue] = useState(String(amount));
  const [cur, setCur] = useState(currency);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="number"
        min={0}
        step="0.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-24 rounded-md border bg-background px-2 text-sm"
        aria-label="Fee per traveller"
      />
      <select value={cur} onChange={(e) => setCur(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
        <option>USD</option>
        <option>TZS</option>
      </select>
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setFeePerPerson(Number(value), cur);
            setMsg(r.success ? 'Saved. New bookings use this fee.' : 'Not saved: check the number.');
          })
        }
      >
        Save
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
