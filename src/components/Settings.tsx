import { useEffect, useState } from 'react';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { buildUserProfileData } from '../lib/userProfile';
import { SettingsSkeleton, SettingsView } from './SettingsView';

export function Settings({ householdId, onLogout }: { householdId: string; onLogout: () => void }) {
  const [displayName, setDisplayName] = useState('');
  const [payday, setPayday] = useState('25');
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setDisplayName(userDoc.data().displayName || '');
        }

        const householdDoc = await getDoc(doc(db, 'households', householdId));
        if (householdDoc.exists()) {
          const data = householdDoc.data();
          setPayday(String(data.payday || 25));
          setOwnerUid(data.ownerUid || null);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <SettingsView
      displayName={displayName}
      payday={payday}
      householdId={householdId}
      isOwner={isOwner}
      saving={saving}
      success={success}
      copied={copied}
      onDisplayNameChange={setDisplayName}
      onPaydayChange={setPayday}
      onSave={handleSave}
      onCopyHouseholdId={copyToClipboard}
      onLogout={onLogout}
    />
  );
}
