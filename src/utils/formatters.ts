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
 * 1. Tôn trọng order người dùng đã thiết lập (bằng các nút di chuyển Lên/Xuống hoặc Đảo thứ tự)
 * 2. Tự động ưu tiên Tiền vào (Income / Chuyển khoản đến nhận tiền) diễn ra TRƯỚC Tiền ra (Expense / Chuyển khoản đi)
 *    để tiền nạp vào tài khoản trước rồi mới chi tiêu, tránh số dư bị âm vô lý
 * 3. So sánh thời gian (giờ:phút sớm hơn diễn ra trước)
 * 4. So sánh thời điểm khởi tạo createdAt
 */
export const compareTransactionsSameDay = (a: Transaction, b: Transaction): number => {
  // 1. Tôn trọng order người dùng đã thiết lập
  if (a.order !== undefined && b.order !== undefined) {
    if (a.order !== b.order) return a.order - b.order;
  }
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;

  // 2. Ưu tiên tiền vào trước tiền ra
  const aIsInflow = a.type === 'income' || (a.type === 'transfer' && Boolean(a.toAccountId));
  const bIsInflow = b.type === 'income' || (b.type === 'transfer' && Boolean(b.toAccountId));
  const aIsExpense = a.type === 'expense';
  const bIsExpense = b.type === 'expense';

  if (aIsInflow && bIsExpense) return -1;
  if (aIsExpense && bIsInflow) return 1;

  // 3. So sánh giờ
  if ((a.time || '') !== (b.time || '')) {
    return (a.time || '').localeCompare(b.time || '');
  }

  // 4. So sánh thời điểm tạo
  return (a.createdAt || 0) - (b.createdAt || 0);
};
