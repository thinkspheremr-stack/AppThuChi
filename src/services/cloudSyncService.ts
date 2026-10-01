import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Account, Category, DebtRecord, ReminderSetting, Transaction } from '../types';

export interface CloudUserData {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  lastSyncedAt: string;
  accounts: Account[];
  transactions: Transaction[];
  categories?: Category[];
  reminders?: ReminderSetting[];
  debts?: DebtRecord[];
}

/**
 * Upload all user data to Cloud Firestore backup
 */
export async function backupDataToCloud(
  user: User,
  accounts: Account[],
  transactions: Transaction[],
  categories: Category[],
  reminders: ReminderSetting[],
  debts?: DebtRecord[]
): Promise<string> {
  const path = `users/${user.uid}`;
  const nowStr = new Date().toISOString();

  try {
    const payload: CloudUserData = {
      email: user.email || '',
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastSyncedAt: nowStr,
      accounts,
      transactions,
      categories,
      reminders,
      debts,
    };

    await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
    return nowStr;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Download user data from Cloud Firestore
 */
export async function loadDataFromCloud(user: User): Promise<CloudUserData | null> {
  const path = `users/${user.uid}`;

  try {
    const docSnap = await getDoc(doc(db, 'users', user.uid));
    if (docSnap.exists()) {
      return docSnap.data() as CloudUserData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
