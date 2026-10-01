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

  if (!showSign) return formatted;
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
