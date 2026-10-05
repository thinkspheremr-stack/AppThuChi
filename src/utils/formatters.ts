import { Transaction } from '../types';

/**
 * Format number to Vietnamese Dong currency string
 * e.g. 1500000 -> "1.500.000 ₫"
 */
export const formatCurrency = (amount: number, showSign: boolean = false): string => {
  const formatted = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (!showSign) {
    if (amount < 0) return `-${formatted}`;
    return formatted;
  }
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
};

/**
 * Format compact VND: 1.500.000 -> 1.5 tr, 50.000 -> 50k
 */
export const formatCompactCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return (amount / 1_000_000_000).toFixed(1).replace('.0', '') + ' tỷ';
  }
  if (abs >= 1_000_000) {
    return (amount / 1_000_000).toFixed(1).replace('.0', '') + ' tr';
  }
  if (abs >= 1_000) {
    return (amount / 1_000).toFixed(0) + ' k';
  }
  return amount.toLocaleString('vi-VN') + ' đ';
};

/**
 * Format date string (YYYY-MM-DD) to friendly Vietnamese date
 */
export const formatFriendlyDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const dayOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][date.getDay()];
  const formattedD = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

  if (isToday) return `Hôm nay (${formattedD})`;
  if (isYesterday) return `Hôm qua (${formattedD})`;
  return `${dayOfWeek}, ${formattedD}`;
};

/**
 * Format YYYY-MM to "Tháng MM/YYYY"
 */
export const formatMonthYear = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  return `Tháng ${month}/${year}`;
};

/**
 * Get days in month
 */
export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

/**
 * So sánh thứ tự 2 giao dịch diễn ra trong cùng một ngày theo quy tắc tài chính chuẩn xác:
 * 1. Tôn trọng order người dùng đã thiết lập (nếu có di chuyển ▲/▼ thủ công)
 * 2. Tự động phân tích quan hệ dòng tiền trên tài khoản chung giữa 2 giao dịch:
 *    - Nếu cả 2 cùng tác động lên một tài khoản ngân hàng (ví dụ Bắc Á, Vietcombank...):
 *      Giao dịch làm TĂNG tiền tài khoản (Income hoặc Chuyển khoản đến nhận tiền)
 *      BẮT BUỘC PHẢI DIỄN RA TRƯỚC giao dịch làm GIẢM tiền tài khoản (Expense hoặc Chuyển khoản đi/tiết kiệm)
 *      để tiền nạp vào trước rồi mới chi/chuyển đi, tránh số dư bị âm vô lý!
 * 3. Ưu tiên tiền vào hệ thống trước tiền ra khỏi hệ thống
 * 4. So sánh thời gian (giờ:phút sớm hơn diễn ra trước)
 * 5. So sánh thời điểm khởi tạo createdAt
 */
export const compareTransactionsSameDay = (a: Transaction, b: Transaction): number => {
  // 1. Tôn trọng order người dùng đã thiết lập
  if (a.order !== undefined && b.order !== undefined) {
    if (a.order !== b.order) return a.order - b.order;
  }
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;

  // 2. Tìm tài khoản chung giữa 2 giao dịch (loại trừ 'saving')
  const aAccounts = [a.accountId, a.toAccountId].filter(Boolean) as string[];
  const bAccounts = [b.accountId, b.toAccountId].filter(Boolean) as string[];
  const commonAccount = aAccounts.find((id) => id !== 'saving' && bAccounts.includes(id));

  if (commonAccount) {
    // Xác định giao dịch nào làm TĂNG (+1) tiền tài khoản chung và giao dịch nào làm GIẢM (-1)
    const getEffectOnAccount = (tx: Transaction, accId: string): number => {
      if (tx.type === 'income' && tx.accountId === accId) return 1;
      if (tx.type === 'transfer' && tx.toAccountId === accId) return 1;
      if (tx.type === 'expense' && tx.accountId === accId) return -1;
      if (tx.type === 'transfer' && tx.accountId === accId) return -1;
      return 0;
    };

    const effectA = getEffectOnAccount(a, commonAccount);
    const effectB = getEffectOnAccount(b, commonAccount);

    // Giao dịch nạp tiền (+1) PHẢI đi trước giao dịch rút tiền/chi tiêu (-1)
    if (effectA > effectB) return -1;
    if (effectA < effectB) return 1;
  }

  // 3. Ưu tiên tiền vào chung trước tiền ra
  const isPureInflow = (tx: Transaction) =>
    tx.type === 'income' || (tx.type === 'transfer' && Boolean(tx.toAccountId) && tx.toAccountId !== 'saving');
  const isPureOutflow = (tx: Transaction) =>
    tx.type === 'expense' || (tx.type === 'transfer' && (!tx.toAccountId || tx.toAccountId === 'saving'));

  if (isPureInflow(a) && isPureOutflow(b)) return -1;
  if (isPureOutflow(a) && isPureInflow(b)) return 1;

  // 4. So sánh giờ
  if ((a.time || '') !== (b.time || '')) {
    return (a.time || '').localeCompare(b.time || '');
  }

  // 5. So sánh thời điểm tạo
  return (a.createdAt || 0) - (b.createdAt || 0);
};
