export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'bank' | 'wallet' | 'cash' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bankName?: string; // Vietcombank, Techcombank, MB Bank, v.v.
  accountNumber?: string;
  balance: number;
  initialBalance: number;
  color: string;
  iconName: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  accountId: string; // The primary account (spent from or deposited to)
  toAccountId?: string; // For transfers
  categoryId?: string; // Category ID
  description: string;
  note?: string;
  tags?: string[];
  createdAt: number;
}

export interface ReminderSetting {
  id: string;
  title: string;
  type: 'daily' | 'monthly' | 'custom';
  time: string; // "20:00"
  dayOfMonth?: number; // 1 to 31 (for monthly)
  enabled: boolean;
  message: string;
  soundEnabled: boolean;
  lastNotifiedDate?: string; // YYYY-MM-DD
}

export interface MonthlyBudget {
  month: string; // "YYYY-MM"
  overallBudget: number;
  categoryBudgets: Record<string, number>; // categoryId -> budget amount
  accountBudgets?: Record<string, number>; // accountId -> max expense limit
}

// ============================================================================
// ĐỊNH NGHĨA SỔ GHI NỢ (DEBT TRACKER)
// ============================================================================
export type DebtType = 'lend' | 'borrow'; // 'lend': Cho vay (Người khác nợ tôi); 'borrow': Đi vay (Tôi nợ người khác)
export type DebtStatus = 'unpaid' | 'partial' | 'paid';

export interface DebtPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  accountId?: string;
  createdAt: number;
}

export interface DebtRecord {
  id: string;
  type: DebtType;
  personName: string; // Tên người nợ / chủ nợ
  phoneNumber?: string;
  originalAmount: number; // Số tiền gốc ban đầu
  paidAmount: number; // Đã trả / đã thu
  remainingAmount: number; // Còn lại
  startDate: string; // Ngày vay/cho vay (YYYY-MM-DD)
  dueDate?: string; // Hạn trả (YYYY-MM-DD)
  status: DebtStatus;
  description: string; // Mục đích / nội dung
  note?: string;
  accountId?: string; // Tài khoản chuyển tiền / nhận tiền
  payments: DebtPayment[]; // Lịch sử thanh toán từng đợt
  createdAt: number;
}

// ============================================================================
// TÀI SẢN DỰ PHÒNG & NGUỒN CÂN ĐỐI TRẢ NỢ (GOLD, REAL ESTATE, SAVINGS, ETC.)
// ============================================================================
export type DebtAssetType = 'gold' | 'real_estate' | 'saving' | 'stock' | 'vehicle' | 'other';

export interface DebtAsset {
  id: string;
  name: string;
  type: DebtAssetType;
  estimatedValue: number; // Giá trị ước tính (VNĐ)
  quantity?: string; // Số lượng (ví dụ: "3 lượng SJC", "1 căn chung cư 75m2", "5.000 CP")
  liquidity?: 'high' | 'medium' | 'low'; // Khả năng thanh khoản / bán nhanh
  note?: string; // Ghi chú (ví dụ: Đang gửi két sắt, Có thể bán ngay, v.v.)
  createdAt: number;
}

// ============================================================================
// SỔ TIẾT KIỆM & TÍCH LŨY MỤC TIÊU (SAVINGS BOOK & GOALS)
// ============================================================================
export interface SavingDeposit {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  type: 'deposit' | 'withdraw'; // Nạp tiền hay Rút tiền
  fromAccountId?: string; // Ngân hàng nguồn
  toAccountId?: string; // Ngân hàng nhận khi rút
  note?: string;
  createdAt: number;
}

export interface SavingBook {
  id: string;
  name: string; // Ví dụ: "Quỹ khẩn cấp 6 tháng", "Tiết kiệm mua xe", "Tích lũy Timo Heo Đất"
  targetAmount?: number; // Số tiền mục tiêu
  currentBalance: number; // Số dư tiết kiệm hiện tại
  bankAccountId?: string; // Ngân hàng liên kết mở sổ (Vietcombank, Timo...)
  interestRate?: number; // Lãi suất %/năm
  termMonths?: number; // Kỳ hạn (0 = không kỳ hạn, 1, 3, 6, 12, 24 tháng)
  startDate: string; // Ngày gửi (YYYY-MM-DD)
  dueDate?: string; // Ngày đáo hạn
  color?: string;
  icon?: string;
  note?: string;
  deposits?: SavingDeposit[];
  createdAt: number;
}

