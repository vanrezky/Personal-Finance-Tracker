import { doc, getDoc, type Firestore } from 'firebase/firestore';

export async function isHouseholdMember(firestore: Firestore, householdId: string, userId: string): Promise<boolean> {
  try {
    const household = await getDoc(doc(firestore, 'households', householdId));
    return household.exists() && Array.isArray(household.data().members) && household.data().members.includes(userId);
  } catch {
    return false;
  }
}
