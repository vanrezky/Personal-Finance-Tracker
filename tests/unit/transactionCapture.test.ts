import assert from 'node:assert/strict';
import test from 'node:test';
import { findPotentialDuplicateTransactions, sha256Fingerprint, type CaptureFields } from '../../src/lib/transactionCapture';
import type { TransactionRecord } from '../../src/components/financeTypes';

test('fingerprints image bytes with SHA-256', async () => {
  assert.equal(await sha256Fingerprint(new TextEncoder().encode('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('warns for same date, amount and type with matching category or normalized merchant', () => {
  const fields: CaptureFields = { type: 'expense', amount: 45000, category: 'Makan', note: 'Kopi Pagi', date: '2026-11-05' };
  const existing: TransactionRecord[] = [
    { id: 'same-category', type: 'expense', amount: 45000, category: 'Makan', date: '2026-11-05' },
    { id: 'same-merchant', type: 'expense', amount: 45000, category: 'Jajan', note: '  KOPI   PAGI ', date: '2026-11-05T08:00:00' },
    { id: 'different-type', type: 'income', amount: 45000, category: 'Makan', date: '2026-11-05' },
    { id: 'different-day', type: 'expense', amount: 45000, category: 'Makan', date: '2026-11-04' },
    { id: 'different-amount', type: 'expense', amount: 45001, category: 'Makan', date: '2026-11-05' },
  ];

  assert.deepEqual(findPotentialDuplicateTransactions(existing, fields).map((item) => item.id), ['same-category', 'same-merchant']);
});
