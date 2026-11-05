import { useEffect, useState } from 'react';
import { auth, collection, db, doc, setDoc, getDoc, onSnapshot, query, updateDoc, where } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { buildUserProfileData } from '../lib/userProfile';
import { SettingsSkeleton, SettingsView, type HouseholdJoinRequest } from './SettingsView';

export function Settings({ householdId, onLogout }: { householdId: string; onLogout: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [payday, setPayday] = useState('25');
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinRequests, setJoinRequests] = useState<HouseholdJoinRequest[]>([]);
  const [reviewingJoinRequestUid, setReviewingJoinRequestUid] = useState<string | null>(null);
  const [joinRequestError, setJoinRequestError] = useState('');

  useEffect(() => {
    let unsubscribeJoinRequests = () => {};
    let active = true;
    const fetchData = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      setOwnerUid(null);
      setJoinRequests([]);

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setDisplayName(userDoc.data().displayName || '');
        }

        const householdDoc = await getDoc(doc(db, 'households', householdId));
        if (householdDoc.exists()) {
          const data = householdDoc.data();
          setPayday(String(data.payday || 25));
          const currentOwnerUid = data.ownerUid || null;
          setOwnerUid(currentOwnerUid);
          if (currentOwnerUid === currentUser.uid) {
            const requestsPath = `households/${householdId}/joinRequests`;
            const unsubscribe = onSnapshot(
              query(collection(db, requestsPath), where('status', '==', 'pending')),
              (snapshot) => setJoinRequests(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<HouseholdJoinRequest, 'id'>) }))),
              () => setJoinRequestError('Permintaan household tidak dapat dimuat.'),
            );
            if (active) unsubscribeJoinRequests = unsubscribe;
            else unsubscribe();
          } else {
            setJoinRequests([]);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      active = false;
      unsubscribeJoinRequests();
    };
  }, [householdId]);

  const isOwner = auth.currentUser?.uid === ownerUid;

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth.currentUser) return;

    setSaving(true);
    setSuccess(false);

    try {
      await setDoc(
        doc(db, 'users', auth.currentUser.uid),
        buildUserProfileData(auth.currentUser, { displayName }),
        { merge: true }
      );

      if (isOwner) {
        await setDoc(
          doc(db, 'households', householdId),
          { payday: parseInt(payday, 10) },
          { merge: true }
        );
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `households/${householdId}`);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(householdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReviewJoinRequest = async (userUid: string, status: 'approved' | 'denied') => {
    setReviewingJoinRequestUid(userUid);
    setJoinRequestError('');
    try {
      await updateDoc(doc(db, 'households', householdId, 'joinRequests', userUid), { status });
    } catch {
      setJoinRequestError('Permintaan tidak berhasil diperbarui. Coba lagi.');
    } finally {
      setReviewingJoinRequestUid(null);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <SettingsView
      displayName={displayName}
      payday={payday}
      householdId={householdId}
      isOwner={isOwner}
      joinRequests={joinRequests}
      reviewingJoinRequestUid={reviewingJoinRequestUid}
      joinRequestError={joinRequestError}
      saving={saving}
      success={success}
      copied={copied}
      onDisplayNameChange={setDisplayName}
      onPaydayChange={setPayday}
      onSave={handleSave}
      onCopyHouseholdId={copyToClipboard}
      onReviewJoinRequest={handleReviewJoinRequest}
      onLogout={onLogout}
    />
  );
}
