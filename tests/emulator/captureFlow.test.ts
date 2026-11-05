import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { approvePendingCapture, createPendingCapture, scanReceiptImage, type CaptureFields } from '../../src/lib/transactionCapture';

const projectId = 'demo-moni';
const householdId = 'household-test';
const fingerprint = 'a'.repeat(64);
const fields: CaptureFields = {
  type: 'expense',
  amount: 42500,
  category: 'Makan',
  note: 'Warung Pagi',
  date: '2026-11-05',
};

let testEnv: RulesTestEnvironment;
let emulatorAppNumber = 0;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await readFile('firestore.rules', 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, 'households', householdId), {
      name: 'Rumah Dummy',
      members: ['owner', 'member'],
      ownerUid: 'owner',
      createdAt: '2026-01-01T00:00:00.000Z',
      payday: 25,
    });
    await setDoc(doc(firestore, 'households', householdId, 'transactions', 'legacy'), {
      householdId,
      type: 'expense',
      amount: 12000,
      category: 'Makan',
      note: 'Transaksi lama',
      date: '2026-11-04',
      createdAt: '2026-11-04T00:00:00.000Z',
      authorUid: 'owner',
      authorName: 'Pemilik',
      receiptImage: 'data:image/jpeg;base64,/9j/AA==',
    });
  });
});

after(async () => {
  await testEnv.cleanup();
});

async function createModularEmulatorClient(): Promise<{ app: FirebaseApp; firestore: Firestore; householdId: string; userUid: string }> {
  emulatorAppNumber += 1;
  const suffix = `${Date.now()}-${emulatorAppNumber}`;
  const app = initializeApp({ apiKey: 'demo-moni', authDomain: 'localhost', projectId }, `capture-test-${suffix}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(auth, `capture-${suffix}@example.test`, 'emulator-test-password');
  const firestore = getFirestore(app);
  connectFirestoreEmulator(firestore, '127.0.0.1', 8080);
  const userUid = credential.user.uid;
  const testHouseholdId = `household-${suffix}`;
  await setDoc(doc(firestore, 'households', testHouseholdId), {
    name: 'Rumah Test',
    members: [userUid],
    ownerUid: userUid,
    createdAt: '2026-11-05T00:00:00.000Z',
    payday: 25,
  });
  await setDoc(doc(firestore, 'households', testHouseholdId, 'transactions', 'legacy'), {
    householdId: testHouseholdId,
    type: 'expense',
    amount: 12000,
    category: 'Makan',
    note: 'Transaksi lama',
    date: '2026-11-04',
    createdAt: '2026-11-04T00:00:00.000Z',
    authorUid: userUid,
    authorName: 'Pemilik',
    receiptImage: 'data:image/jpeg;base64,/9j/AA==',
  });
  return { app, firestore, householdId: testHouseholdId, userUid };
}

test('household data is private; approved join requests gate membership', async () => {
  const applicant = testEnv.authenticatedContext('applicant').firestore();
  const owner = testEnv.authenticatedContext('owner').firestore();
  const householdRef = doc(applicant, 'households', householdId);
  const requestRef = doc(applicant, 'households', householdId, 'joinRequests', 'applicant');

  await assertFails(getDoc(householdRef));
  await assertFails(getDocs(collection(applicant, 'households', householdId, 'transactions')));
  await assertSucceeds(setDoc(requestRef, {
    householdId,
    userUid: 'applicant',
    displayName: 'Pemohon',
    status: 'pending',
    createdAt: '2026-11-05T00:00:00.000Z',
  }));
  await assertFails(updateDoc(householdRef, { members: arrayUnion('applicant') }));

  const pending = await assertSucceeds(getDocs(query(
    collection(owner, 'households', householdId, 'joinRequests'),
    where('status', '==', 'pending'),
  )));
  assert.equal(pending.size, 1);
  await assertSucceeds(updateDoc(doc(owner, 'households', householdId, 'joinRequests', 'applicant'), { status: 'approved' }));
  await assertSucceeds(updateDoc(householdRef, { members: arrayUnion('applicant') }));
  assert.equal((await getDoc(householdRef)).data()?.members.includes('applicant'), true);
});

test('members cannot approve requests or change other membership; outsiders cannot read requests', async () => {
  const member = testEnv.authenticatedContext('member').firestore();
  const outsider = testEnv.authenticatedContext('outsider').firestore();
  const owner = testEnv.authenticatedContext('owner').firestore();
  const requestPath = ['households', householdId, 'joinRequests', 'applicant'] as const;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), ...requestPath), {
      householdId,
      userUid: 'applicant',
      displayName: 'Pemohon',
      status: 'pending',
      createdAt: '2026-11-05T00:00:00.000Z',
    });
  });

  await assertFails(updateDoc(doc(member, ...requestPath), { status: 'approved' }));
  await assertFails(updateDoc(doc(member, 'households', householdId), { members: arrayUnion('outsider') }));
  await assertFails(updateDoc(doc(member, 'households', householdId), { privateNote: 'unexpected field' }));
  await assertFails(getDocs(collection(outsider, 'households', householdId, 'joinRequests')));
  await assertSucceeds(getDocs(query(collection(owner, 'households', householdId, 'joinRequests'), where('status', '==', 'pending'))));
});

test('pending captures are private, validated, and separate from legacy transactions', async () => {
  const owner = testEnv.authenticatedContext('owner').firestore();
  const member = testEnv.authenticatedContext('member').firestore();
  const pendingRef = doc(owner, 'households', householdId, 'pendingCaptures', fingerprint);
  const capture = {
    ...fields,
    householdId,
    createdAt: '2026-11-05T00:00:00.000Z',
    authorUid: 'owner',
    authorName: 'Pemilik',
    captureFingerprint: fingerprint,
  };

  await assertSucceeds(setDoc(pendingRef, capture));
  await assertSucceeds(getDoc(pendingRef));
  await assertFails(getDoc(doc(member, 'households', householdId, 'pendingCaptures', fingerprint)));
  await assertFails(setDoc(doc(owner, 'households', householdId, 'pendingCaptures', 'b'.repeat(64)), { ...capture, captureFingerprint: 'b'.repeat(64), receiptImage: 'raw-image' }));
  await assertFails(setDoc(doc(testEnv.authenticatedContext('outsider').firestore(), 'households', householdId, 'pendingCaptures', 'c'.repeat(64)), { ...capture, authorUid: 'outsider', captureFingerprint: 'c'.repeat(64) }));

  const ledger = await assertSucceeds(getDocs(collection(owner, 'households', householdId, 'transactions')));
  assert.equal(ledger.size, 1);
  assert.equal(ledger.docs[0].data().receiptImage, 'data:image/jpeg;base64,/9j/AA==');
});

test('mocked scan creates only a pending capture, then atomically approves it into the ledger', async () => {
  const client = await createModularEmulatorClient();
  const { firestore, householdId: testHouseholdId, userUid } = client;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ ...fields, date: fields.date }), { status: 200 });
  try {
    const scan = await scanReceiptImage('/9j/AA==', 'dummy-emulator-token', ['Makan', 'Lainnya']);
    const captureFields = { ...scan, date: scan.date ?? fields.date };
    await createPendingCapture(firestore, testHouseholdId, userUid, 'Pemilik', captureFields, fingerprint);

    const pendingRef = doc(firestore, 'households', testHouseholdId, 'pendingCaptures', fingerprint);
    const transactionRef = doc(firestore, 'households', testHouseholdId, 'transactions', fingerprint);
    assert.equal((await getDoc(pendingRef)).exists(), true);
    assert.equal((await getDocs(collection(firestore, 'households', testHouseholdId, 'transactions'))).size, 1);

    await approvePendingCapture(firestore, testHouseholdId, fingerprint, userUid, 'Pemilik', captureFields);
    const remainingPending = await getDocs(query(
      collection(firestore, 'households', testHouseholdId, 'pendingCaptures'),
      where('authorUid', '==', userUid),
    ));
    assert.equal(remainingPending.empty, true);
    const transaction = await getDoc(transactionRef);
    assert.equal(transaction.exists(), true);
    assert.equal(transaction.data()?.captureFingerprint, fingerprint);
    assert.equal((await getDocs(collection(firestore, 'households', testHouseholdId, 'transactions'))).size, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await deleteApp(client.app);
  }
});

test('exact screenshot fingerprints cannot be captured twice, and concurrent confirmation writes once', async () => {
  const client = await createModularEmulatorClient();
  const { firestore, householdId: testHouseholdId, userUid } = client;
  try {
    await createPendingCapture(firestore, testHouseholdId, userUid, 'Pemilik', fields, fingerprint);
    const results = await Promise.allSettled([
      approvePendingCapture(firestore, testHouseholdId, fingerprint, userUid, 'Pemilik', fields),
      approvePendingCapture(firestore, testHouseholdId, fingerprint, userUid, 'Pemilik', fields),
    ]);

    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    await assert.rejects(createPendingCapture(firestore, testHouseholdId, userUid, 'Pemilik', fields, fingerprint));
    assert.equal((await getDocs(collection(firestore, 'households', testHouseholdId, 'transactions'))).size, 2);
    const captureTransaction = doc(firestore, 'households', testHouseholdId, 'transactions', fingerprint);
    await assertSucceeds(updateDoc(captureTransaction, { note: 'Catatan diperbarui' }));
    await assertFails(updateDoc(captureTransaction, { captureFingerprint: deleteField() }));
    await assertSucceeds(deleteDoc(doc(firestore, 'households', testHouseholdId, 'transactions', fingerprint)));
  } finally {
    await deleteApp(client.app);
  }
});
