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
 * So sánh thứ tự 2 giao dịch diễn ra trong cùng một ngày theo quy tắc chuẩn xác:
 * 1. Tôn trọng order người dùng đã thiết lập (nếu có di chuyển ▲/▼ thủ công)
 * 2. So sánh mốc thời gian (giờ:phút). Giờ sớm hơn diễn ra trước (ví dụ 09:30 trước 15:45).
 * 3. Nếu cùng giờ hoặc không có giờ: Ghi nhận theo thời gian điền vào (cái nào nhập trước xem như có trước: createdAt)
 * 4. Fallback so sánh ID nếu thời điểm tạo trùng nhau
 */
export const compareTransactionsSameDay = (a: Transaction, b: Transaction): number => {
  // 1. Tôn trọng order người dùng đã thiết lập thủ công
  if (a.order !== undefined && b.order !== undefined) {
    if (a.order !== b.order) return a.order - b.order;
  }
  if (a.order !== undefined) return -1;
  if (b.order !== undefined) return 1;

  // 2. So sánh mốc thời gian (HH:mm)
  const timeA = (a.time || '').trim();
  const timeB = (b.time || '').trim();
  if (timeA && timeB && timeA !== timeB) {
    return timeA.localeCompare(timeB);
  }

  // 3. Nếu cùng mốc giờ hoặc cả 2 không có giờ: Sắp xếp theo thời điểm điền vào (cái nào tạo trước diễn ra trước)
  const createdA = typeof a.createdAt === 'number' ? a.createdAt : 0;
  const createdB = typeof b.createdAt === 'number' ? b.createdAt : 0;
  if (createdA !== createdB) {
    return createdA - createdB;
  }

  // 4. Nếu 1 bên có time và 1 bên không có: bên có time rõ ràng được ưu tiên
  if (timeA && !timeB) return -1;
  if (!timeA && timeB) return 1;

  // 5. Fallback ID
  return (a.id || '').localeCompare(b.id || '');
};

