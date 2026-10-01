import { ReminderSetting, Transaction } from '../types';

/**
 * Play a gentle, pleasant notification chime using Web Audio API
 */
export const playNotificationChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Play a friendly two-tone bell chime (E5 -> B5)
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(659.25, now, 0.4);       // E5
    playTone(987.77, now + 0.12, 0.6); // B5
  } catch (err) {
    console.warn('Audio chime could not play:', err);
  }
};

/**
 * Request browser notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
};

/**
 * Send an immediate notification
 */
export const sendBrowserNotification = (title: string, body: string, sound: boolean = true) => {
  if (sound) {
    playNotificationChime();
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'https://api.iconify.design/lucide:wallet.svg?color=%2310b981',
      });
    } catch {
      // Fallback if inside iframe where Notification constructor might be restricted
    }
  }
};

/**
 * Check if today has any transaction recorded
 */
export const hasTransactionToday = (transactions: Transaction[]): boolean => {
  const todayStr = new Date().toISOString().slice(0, 10);
  return transactions.some((t) => t.date === todayStr);
};

/**
 * Calculate consecutive logging streak (days)
 */
export const calculateStreak = (transactions: Transaction[]): { streak: number; loggedToday: boolean } => {
  if (!transactions.length) return { streak: 0, loggedToday: false };

  const uniqueDates = new Set(transactions.map((t) => t.date));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const loggedToday = uniqueDates.has(todayStr);

  let currentStreak = 0;
  // Start checking from today or yesterday
  const checkDate = new Date(today);
  if (!loggedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (uniqueDates.has(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return { streak: currentStreak, loggedToday };
};

/**
 * Periodic checker for reminders
 */
export const checkDueReminders = (
  reminders: ReminderSetting[],
  transactions: Transaction[],
  onTrigger: (reminder: ReminderSetting) => void
): ReminderSetting[] => {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDayOfMonth = now.getDate();

  let hasUpdates = false;
  const updatedReminders = reminders.map((rem) => {
    if (!rem.enabled) return rem;
    if (rem.lastNotifiedDate === todayStr) return rem;

    const [remH, remM] = rem.time.split(':').map(Number);
    
    // Check if within the reminder time window (current minute or slightly passed this hour)
    const timeMatch = currentHour === remH && Math.abs(currentMinute - remM) <= 2;

    if (rem.type === 'daily' && timeMatch) {
      // Check if user has already logged today
      const alreadyLogged = hasTransactionToday(transactions);
      if (!alreadyLogged) {
        onTrigger(rem);
        hasUpdates = true;
        return { ...rem, lastNotifiedDate: todayStr };
      }
    } else if (rem.type === 'monthly' && timeMatch && rem.dayOfMonth === currentDayOfMonth) {
      onTrigger(rem);
      hasUpdates = true;
      return { ...rem, lastNotifiedDate: todayStr };
    }

    return rem;
  });

  return hasUpdates ? updatedReminders : reminders;
};
