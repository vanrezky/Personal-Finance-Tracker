import {
  deleteDoc,
  doc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { PendingCapture, TransactionRecord, TransactionType } from '../components/financeTypes';
import { isDateOnly, normalizeScanReceiptResult, type ScanReceiptResult } from './scanReceiptSchema';

const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

export interface CaptureFields {
  type: TransactionType;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export async function sha256Fingerprint(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function prepareCaptureImage(file: File): Promise<{ imageBase64: string; fingerprint: string; previewDataUrl: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar untuk memindai transaksi.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Gambar tidak dapat dibuka. Pilih gambar lain.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context || !image.width || !image.height) throw new Error('Gambar tidak dapat diproses.');

    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.72);
    const imageBase64 = previewDataUrl.slice(previewDataUrl.indexOf(',') + 1);
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) throw new Error('Ukuran gambar terlalu besar. Pilih screenshot yang lebih ringan.');

    const binary = atob(imageBase64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return { imageBase64, fingerprint: await sha256Fingerprint(bytes), previewDataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function scanReceiptImage(imageBase64: string, idToken: string, categories: string[]): Promise<ScanReceiptResult> {
  const response = await fetch('/api/scan-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ imageBase64, categories }),
  });
  const payload = await response.json() as unknown;
  if (!response.ok) {
    const error = payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Gagal menganalisa gambar.';
    throw new Error(error);
  }
  return normalizeScanReceiptResult(payload, categories);
}

export async function createPendingCapture(
  firestore: Firestore,
  householdId: string,
  authorUid: string,
  authorName: string,
  fields: CaptureFields,
  fingerprint: string,
): Promise<string> {
  validateCaptureFields(fields);
  if (!/^[a-f0-9]{64}$/.test(fingerprint)) throw new Error('Fingerprint gambar tidak valid.');

  const pendingRef = doc(firestore, 'households', householdId, 'pendingCaptures', fingerprint);
  const transactionRef = doc(firestore, 'households', householdId, 'transactions', fingerprint);
  const pending: Omit<PendingCapture, 'id'> = {
    ...fields,
    householdId,
    authorUid,
    authorName: authorName.trim().slice(0, 200),
    createdAt: new Date().toISOString(),
    captureFingerprint: fingerprint,
  };

  await runTransaction(firestore, async (transaction) => {
    const ledgerSnapshot = await transaction.get(transactionRef);
    if (ledgerSnapshot.exists()) {
      throw new Error('Screenshot ini sudah pernah ditambahkan atau dikonfirmasi.');
    }
    transaction.set(pendingRef, pending);
  });

  return fingerprint;
}

export async function approvePendingCapture(
  firestore: Firestore,
  householdId: string,
  captureId: string,
  authorUid: string,
  authorName: string,
  fields: CaptureFields,
): Promise<void> {
  validateCaptureFields(fields);
  if (!/^[a-f0-9]{64}$/.test(captureId)) throw new Error('Capture tidak valid.');

  const pendingRef = doc(firestore, 'households', householdId, 'pendingCaptures', captureId);
  const transactionRef = doc(firestore, 'households', householdId, 'transactions', captureId);

  await runTransaction(firestore, async (transaction) => {
    const pendingSnapshot = await transaction.get(pendingRef);
    if (!pendingSnapshot.exists() || pendingSnapshot.data().authorUid !== authorUid) {
      throw new Error('Capture tertunda tidak ditemukan.');
    }

    const ledgerSnapshot = await transaction.get(transactionRef);
    if (ledgerSnapshot.exists()) throw new Error('Screenshot ini sudah tercatat sebagai transaksi.');

    transaction.set(transactionRef, {
      ...fields,
      householdId,
      authorUid,
      ...(authorName.trim() ? { authorName: authorName.trim().slice(0, 200) } : {}),
      createdAt: new Date().toISOString(),
      captureFingerprint: captureId,
    });
    transaction.delete(pendingRef);
  });
}

export async function discardPendingCapture(firestore: Firestore, householdId: string, captureId: string): Promise<void> {
  const pendingRef = doc(firestore, 'households', householdId, 'pendingCaptures', captureId);
  await deleteDoc(pendingRef);
}

export function findPotentialDuplicateTransactions(transactions: TransactionRecord[], fields: CaptureFields): TransactionRecord[] {
  const normalizedNote = normalizeNote(fields.note);
  return transactions.filter((item) => {
    const sameDay = item.date?.slice(0, 10) === fields.date;
    const sameDetails = item.amount === fields.amount && item.type === fields.type;
    const similarCategoryOrNote = item.category === fields.category || (!!normalizedNote && normalizeNote(item.note ?? '') === normalizedNote);
    return sameDay && sameDetails && similarCategoryOrNote;
  });
}

function normalizeNote(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ');
}

function validateCaptureFields(fields: CaptureFields): void {
  if (
    (fields.type !== 'income' && fields.type !== 'expense') ||
    !Number.isSafeInteger(fields.amount) || fields.amount <= 0 ||
    typeof fields.category !== 'string' || !fields.category.trim() || fields.category.length > 100 ||
    typeof fields.note !== 'string' || fields.note.length > 1000 || !isDateOnly(fields.date)
  ) {
    throw new Error('Periksa kembali nominal dan tanggal transaksi.');
  }
}
