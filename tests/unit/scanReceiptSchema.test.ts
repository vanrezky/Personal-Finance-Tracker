import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeScanReceiptResult, ScanReceiptValidationError, validateReceiptImageBase64 } from '../../src/lib/scanReceiptSchema';

test('normalizes a valid scan result and keeps optional dates empty', () => {
  assert.deepEqual(
    normalizeScanReceiptResult({ type: 'expense', amount: 42500, category: 'Makan', note: 'Warung', date: null }, ['Makan', 'Lainnya']),
    { type: 'expense', amount: 42500, category: 'Makan', note: 'Warung', date: null },
  );
});

test('replaces model categories outside the allowlist with Lainnya', () => {
  assert.equal(
    normalizeScanReceiptResult({ type: 'income', amount: 100000, category: 'Untrusted category', note: '', date: '2026-11-05' }, ['Gaji', 'Lainnya']).category,
    'Lainnya',
  );
});

test('rejects unsafe amounts, invalid type, malformed date, and oversized note', () => {
  const base = { type: 'expense', amount: 1, category: 'Makan', note: '', date: null };
  for (const candidate of [
    { ...base, amount: 0 },
    { ...base, amount: Number.MAX_SAFE_INTEGER + 1 },
    { ...base, type: 'transfer' },
    { ...base, date: '2026-02-30' },
    { ...base, note: 'x'.repeat(51) },
  ]) {
    assert.throws(() => normalizeScanReceiptResult(candidate, ['Makan', 'Lainnya']), ScanReceiptValidationError);
  }
});

test('accepts base64 data and rejects malformed or oversized input', () => {
  assert.equal(validateReceiptImageBase64('/9j/AA=='), true);
  assert.equal(validateReceiptImageBase64('not base64'), false);
  assert.equal(validateReceiptImageBase64('a'.repeat(2_000_004)), false);
});
