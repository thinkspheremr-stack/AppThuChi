import { Account, Category, DebtRecord, ReminderSetting, Transaction } from '../types';

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-vcb',
    name: 'Vietcombank',
    type: 'bank',
    bankName: 'Vietcombank (VCB)',
    accountNumber: '****9821',
    balance: 28500000,
    initialBalance: 20000000,
    color: '#006533', // VCB Green
    iconName: 'Landmark',
    isDefault: true,
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense
  { id: 'cat-food', name: 'Ăn uống', type: 'expense', icon: 'Utensils', color: '#F97316' },
  { id: 'cat-transport', name: 'Xăng xe & Đi lại', type: 'expense', icon: 'Car', color: '#3B82F6' },
  { id: 'cat-housing', name: 'Nhà ở & Tiền phòng', type: 'expense', icon: 'Home', color: '#8B5CF6' },
  { id: 'cat-bills', name: 'Điện, Nước & Internet', type: 'expense', icon: 'Zap', color: '#EAB308' },
  { id: 'cat-shopping', name: 'Mua sắm & Quần áo', type: 'expense', icon: 'ShoppingBag', color: '#EC4899' },
  { id: 'cat-cafe', name: 'Cà phê & Giải trí', type: 'expense', icon: 'Coffee', color: '#14B8A6' },
  { id: 'cat-health', name: 'Sức khỏe & Thuốc men', type: 'expense', icon: 'HeartPulse', color: '#EF4444' },
  { id: 'cat-education', name: 'Học tập & Sách vở', type: 'expense', icon: 'GraduationCap', color: '#6366F1' },
  { id: 'cat-gift', name: 'Hiếu hỉ & Quà tặng', type: 'expense', icon: 'Gift', color: '#F43F5E' },
  { id: 'cat-other-exp', name: 'Chi tiêu khác', type: 'expense', icon: 'MoreHorizontal', color: '#64748B' },

  // Income
  { id: 'cat-salary', name: 'Tiền lương', type: 'income', icon: 'Briefcase', color: '#10B981' },
  { id: 'cat-bonus', name: 'Thưởng & Hoa hồng', type: 'income', icon: 'Trophy', color: '#06B6D4' },
  { id: 'cat-side', name: 'Thu nhập phụ / Freelance', type: 'income', icon: 'Laptop', color: '#84CC16' },
  { id: 'cat-invest', name: 'Lãi tiết kiệm & Đầu tư', type: 'income', icon: 'TrendingUp', color: '#F59E0B' },
  { id: 'cat-other-inc', name: 'Thu nhập khác', type: 'income', icon: 'Coins', color: '#8B5CF6' },
];

export const DEFAULT_REMINDERS: ReminderSetting[] = [
  {
    id: 'rem-daily-evening',
    title: 'Nhắc nhập chi tiêu buổi tối',
    type: 'daily',
    time: '20:30',
    enabled: true,
    message: '🌙 Bạn ơi, tối rồi! Hãy dành 1 phút ghi chép các khoản chi tiêu hôm nay nhé.',
    soundEnabled: true,
  },
  {
    id: 'rem-daily-noon',
    title: 'Nhắc ăn trưa & cà phê',
    type: 'daily',
    time: '13:00',
    enabled: false,
    message: '🍱 Đừng quên lưu lại chi phí ăn trưa hoặc cà phê cùng đồng nghiệp nha!',
    soundEnabled: true,
  },
  {
    id: 'rem-monthly-end',
    title: 'Tổng kết tài chính cuối tháng',
    type: 'monthly',
    time: '19:00',
    dayOfMonth: 28,
    enabled: true,
    message: '📊 Cuối tháng rồi, hãy cùng xem lại biểu đồ thu chi và kiểm tra ngân sách nhé!',
    soundEnabled: true,
  },
  {
    id: 'rem-salary-day',
    title: 'Ngày nhận lương hàng tháng',
    type: 'monthly',
    time: '10:00',
    dayOfMonth: 5,
    enabled: true,
    message: '💰 Ting ting ngày nhận lương! Hãy phân bổ tiền vào các tài khoản và quỹ tiết kiệm.',
    soundEnabled: true,
  },
];

// Generate sample transactions for current month and previous month for Vietcombank
export const generateInitialTransactions = (): Transaction[] => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonthDate = new Date(year, now.getMonth() - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = String(prevMonthDate.getMonth() + 1).padStart(2, '0');

  return [
    // Current Month Income
    {
      id: 'tx-1',
      type: 'income',
      amount: 25000000,
      date: `${year}-${month}-05`,
      time: '09:00',
      accountId: 'acc-vcb',
      categoryId: 'cat-salary',
      description: 'Lương công ty tháng này',
      note: 'Chuyển khoản lương vào Vietcombank',
      createdAt: Date.now() - 25 * 86400000,
    },
    {
      id: 'tx-2',
      type: 'income',
      amount: 3500000,
      date: `${year}-${month}-12`,
      time: '14:30',
      accountId: 'acc-vcb',
      categoryId: 'cat-bonus',
      description: 'Thưởng KPI dự án',
      note: 'Thưởng tiến độ dự án',
      createdAt: Date.now() - 18 * 86400000,
    },

    // Current Month Expenses
    {
      id: 'tx-3',
      type: 'expense',
      amount: 4500000,
      date: `${year}-${month}-06`,
      time: '10:00',
      accountId: 'acc-vcb',
      categoryId: 'cat-housing',
      description: 'Tiền thuê nhà tháng này',
      note: 'Thanh toán tiền nhà qua app',
      createdAt: Date.now() - 24 * 86400000,
    },
    {
      id: 'tx-4',
      type: 'expense',
      amount: 850000,
      date: `${year}-${month}-08`,
      time: '19:45',
      accountId: 'acc-vcb',
      categoryId: 'cat-bills',
      description: 'Hóa đơn tiền điện & nước',
      note: 'Thanh toán online qua Vietcombank Digibank',
      createdAt: Date.now() - 22 * 86400000,
    },
    {
      id: 'tx-5',
      type: 'expense',
      amount: 350000,
      date: `${year}-${month}-10`,
      time: '08:15',
      accountId: 'acc-vcb',
      categoryId: 'cat-transport',
      description: 'Đổ xăng xe máy & bảo dưỡng',
      note: 'Đổ xăng Petrolimex',
      createdAt: Date.now() - 20 * 86400000,
    },
    {
      id: 'tx-6',
      type: 'expense',
      amount: 1200000,
      date: `${year}-${month}-15`,
      time: '12:30',
      accountId: 'acc-vcb',
      categoryId: 'cat-food',
      description: 'Đi siêu thị mua thực phẩm',
      note: 'Quẹt thẻ Vietcombank tại siêu thị',
      createdAt: Date.now() - 15 * 86400000,
    },

    // Previous Month Transactions
    {
      id: 'tx-prev-1',
      type: 'income',
      amount: 25000000,
      date: `${prevYear}-${prevMonth}-05`,
      time: '09:00',
      accountId: 'acc-vcb',
      categoryId: 'cat-salary',
      description: 'Lương công ty tháng trước',
      createdAt: Date.now() - 55 * 86400000,
    },
    {
      id: 'tx-prev-2',
      type: 'expense',
      amount: 4500000,
      date: `${prevYear}-${prevMonth}-06`,
      time: '10:00',
      accountId: 'acc-vcb',
      categoryId: 'cat-housing',
      description: 'Tiền thuê nhà tháng trước',
      createdAt: Date.now() - 54 * 86400000,
    },
  ];
};

export const DEFAULT_DEBTS: DebtRecord[] = [
  {
    id: 'debt-1',
    type: 'lend', // Cho vay (Người khác nợ tôi)
    personName: 'Anh Tuấn (Đồng nghiệp)',
    phoneNumber: '0912 345 678',
    originalAmount: 5000000,
    paidAmount: 2000000,
    remainingAmount: 3000000,
    startDate: '2026-09-10',
    dueDate: '2026-10-15',
    status: 'partial',
    description: 'Cho mượn tiền việc gia đình',
    note: 'Đã trả trước 2tr ngày 20/09, hẹn giữa tháng 10 trả nốt',
    accountId: 'acc-vcb',
    payments: [
      {
        id: 'pay-1',
        amount: 2000000,
        date: '2026-09-20',
        note: 'Chuyển khoản trả đợt 1',
        accountId: 'acc-vcb',
        createdAt: Date.now() - 10 * 86400000,
      },
    ],
    createdAt: Date.now() - 20 * 86400000,
  },
  {
    id: 'debt-2',
    type: 'lend', // Cho vay (Người khác nợ tôi)
    personName: 'Bạn Nam',
    phoneNumber: '0988 776 655',
    originalAmount: 2000000,
    paidAmount: 0,
    remainingAmount: 2000000,
    startDate: '2026-09-18',
    dueDate: '2026-10-05',
    status: 'unpaid',
    description: 'Mượn tiền đóng học phí khóa học',
    note: 'Hẹn đầu tháng 10 nhận lương gửi lại',
    accountId: 'acc-vcb',
    payments: [],
    createdAt: Date.now() - 12 * 86400000,
  },
  {
    id: 'debt-3',
    type: 'borrow', // Đi vay (Tôi nợ người khác)
    personName: 'Chị Mai (Chị gái)',
    phoneNumber: '0903 123 456',
    originalAmount: 10000000,
    paidAmount: 4000000,
    remainingAmount: 6000000,
    startDate: '2026-08-25',
    dueDate: '2026-10-30',
    status: 'partial',
    description: 'Mượn tiền mua thiết bị làm việc',
    note: 'Đã trả bớt 4tr, hẹn cuối tháng 10 trả hết',
    accountId: 'acc-vcb',
    payments: [
      {
        id: 'pay-2',
        amount: 4000000,
        date: '2026-09-08',
        note: 'Chuyển khoản trả đợt 1',
        accountId: 'acc-vcb',
        createdAt: Date.now() - 22 * 86400000,
      },
    ],
    createdAt: Date.now() - 36 * 86400000,
  },
];
