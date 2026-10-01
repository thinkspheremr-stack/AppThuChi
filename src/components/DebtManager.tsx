import React, { useState, useEffect } from 'react';
import {
  Account,
  DebtPayment,
  DebtRecord,
  DebtStatus,
  DebtType,
  DebtAsset,
  DebtAssetType,
  Transaction,
} from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils/formatters';
import {
  FileText,
  User,
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Phone,
  Trash2,
  Edit2,
  DollarSign,
  Landmark,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Search,
  Filter,
  ArrowRightLeft,
  PiggyBank,
  BadgeAlert,
  Send,
  Coins,
  Building2,
  TrendingUp,
  TrendingDown,
  Scale,
  Sparkles,
  BarChart3,
  HelpCircle,
  Wallet,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface DebtManagerProps {
  debts: DebtRecord[];
  accounts: Account[];
  transactions?: Transaction[];
  currentMonth?: string;
  onAddDebt: (
    debt: Omit<
      DebtRecord,
      'id' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'
    >
  ) => void;
  onEditDebt: (debt: DebtRecord) => void;
  onDeleteDebt: (id: string) => void;
  onRecordPayment: (
    debtId: string,
    payment: Omit<DebtPayment, 'id' | 'createdAt'>
  ) => void;
  onMarkAsPaid: (debtId: string) => void;
}

// Default initial assets if user has none
const INITIAL_ASSETS: DebtAsset[] = [
  {
    id: 'asset-gold-1',
    name: 'Vàng nhẫn / SJC tích lũy',
    type: 'gold',
    quantity: '2 lượng (cây)',
    estimatedValue: 170000000,
    liquidity: 'high',
    note: 'Có thể bán ngay trong ngày tại tiệm vàng khi nợ đến hạn',
    createdAt: Date.now() - 30 * 86400000,
  },
  {
    id: 'asset-re-1',
    name: 'Đất nền / Bất động sản dự phòng',
    type: 'real_estate',
    quantity: '1 lô 100m2',
    estimatedValue: 850000000,
    liquidity: 'low',
    note: 'Tài sản lớn tích lũy lâu dài, có thể thế chấp hoặc bán khi cần khoản lớn',
    createdAt: Date.now() - 60 * 86400000,
  },
];

export const DebtManager: React.FC<DebtManagerProps> = ({
  debts,
  accounts,
  transactions = [],
  currentMonth = new Date().toISOString().slice(0, 7),
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onRecordPayment,
  onMarkAsPaid,
}) => {
  // Top-level Navigation: 'debts' (Sổ Nợ) | 'assets' (Quỹ Tiết Kiệm & Tài Sản) | 'report' (Báo Cáo Trả Nợ Hàng Tháng)
  const [activeMainTab, setActiveMainTab] = useState<'debts' | 'assets' | 'report'>('debts');

  // Filter tab inside Debts view: 'all' | 'lend' | 'borrow' | 'due' | 'paid'
  const [filterTab, setFilterTab] = useState<'all' | 'lend' | 'borrow' | 'due' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick inline add form state
  const [newType, setNewType] = useState<DebtType>('borrow'); // Default to borrow as user requested managing debt
  const [newPersonName, setNewPersonName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [inputRawAmount, setInputRawAmount] = useState('');
  const [autoAdd000, setAutoAdd000] = useState(true);
  const [inputDay, setInputDay] = useState(String(new Date().getDate()));
  const [inputMonthYear, setInputMonthYear] = useState(currentMonth);
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAccountId, setNewAccountId] = useState(accounts[0]?.id || '');

  // Payment Modal state
  const [payingDebt, setPayingDebt] = useState<DebtRecord | null>(null);
  const [payRawAmount, setPayRawAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payNote, setPayNote] = useState('');
  const [payAutoAdd000, setPayAutoAdd000] = useState(true);

  // Edit Debt Modal state
  const [editingDebt, setEditingDebt] = useState<DebtRecord | null>(null);
  const [editPersonName, setEditPersonName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editOriginalAmount, setEditOriginalAmount] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Expanded payments history map
  const [expandedHistories, setExpandedHistories] = useState<Record<string, boolean>>({});

  // Assets Management State (Gold, Real Estate, Stocks...)
  const [assets, setAssets] = useState<DebtAsset[]>(() => {
    try {
      const saved = localStorage.getItem('sothuchi_debt_assets');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_ASSETS;
  });

  // Asset Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<DebtAsset | null>(null);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<DebtAssetType>('gold');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetRawValue, setAssetRawValue] = useState('');
  const [assetLiquidity, setAssetLiquidity] = useState<'high' | 'medium' | 'low'>('high');
  const [assetNote, setAssetNote] = useState('');

  // Planning Horizon for debts without due date (months)
  const [defaultHorizonMonths, setDefaultHorizonMonths] = useState<number>(12);

  // Save assets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('sothuchi_debt_assets', JSON.stringify(assets));
    } catch (e) {
      console.error(e);
    }
  }, [assets]);

  const toggleHistory = (debtId: string) => {
    setExpandedHistories((prev) => ({ ...prev, [debtId]: !prev[debtId] }));
  };

  // Calculated amount for quick add
  const rawNum = Number(inputRawAmount) || 0;
  const calculatedAmount = autoAdd000 ? rawNum * 1000 : rawNum;

  // Calculated amount for payment modal
  const rawPayNum = Number(payRawAmount) || 0;
  const calculatedPayAmount = payAutoAdd000 ? rawPayNum * 1000 : rawPayNum;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayDate = new Date();

  // =========================================================================
  // 1. TÍNH TOÁN QUỸ TIẾT KIỆM TỪ SỔ THU CHI
  // =========================================================================
  // Tiết kiệm tích lũy từ các giao dịch chuyển tiền vào Mục Tiết Kiệm (saving)
  const savingsTransfers = transactions.filter(
    (t) => t.type === 'transfer' && (t.toAccountId === 'saving' || t.tags?.includes('saving'))
  );
  const totalSavingsTransfers = savingsTransfers.reduce((sum, t) => sum + t.amount, 0);

  // Tiền trong các tài khoản tiết kiệm chuyên biệt
  const savingAccounts = accounts.filter(
    (a) => a.name.toLowerCase().includes('tiết kiệm') || a.name.toLowerCase().includes('saving')
  );
  const totalSavingAccountsBalance = savingAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Tổng quỹ tiết kiệm khả dụng (lấy giá trị chuyển tích lũy hoặc số dư thực tế trong các tài khoản tiết kiệm)
  const totalSavingsAvailable = Math.max(totalSavingsTransfers, totalSavingAccountsBalance);

  // Toàn bộ số dư tiền mặt/ngân hàng khả dụng
  const totalLiquidCash = accounts.reduce((sum, a) => sum + a.balance, 0);

  // =========================================================================
  // 2. TÍNH TOÁN TÀI SẢN KHÁC (VÀNG, BẤT ĐỘNG SẢN, CỔ PHIẾU...)
  // =========================================================================
  const totalOtherAssets = assets.reduce((sum, a) => sum + a.estimatedValue, 0);
  const goldAssetsValue = assets.filter((a) => a.type === 'gold').reduce((sum, a) => sum + a.estimatedValue, 0);
  const realEstateAssetsValue = assets.filter((a) => a.type === 'real_estate').reduce((sum, a) => sum + a.estimatedValue, 0);

  // Tổng tất cả nguồn lực tài chính dự phòng = Tiết kiệm + Vàng + Bất động sản + Tài sản khác
  const grandTotalReserveAssets = totalSavingsAvailable + totalOtherAssets;

  // =========================================================================
  // 3. TÍNH TOÁN NỢ PHẢI THU & NỢ PHẢI TRẢ
  // =========================================================================
  const lendDebts = debts.filter((d) => d.type === 'lend');
  const totalLendRemaining = lendDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  const borrowDebts = debts.filter((d) => d.type === 'borrow');
  const totalBorrowOriginal = borrowDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalBorrowPaid = borrowDebts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalBorrowRemaining = borrowDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  // Tỷ lệ bảo đảm tài sản / nợ
  const assetCoverageRatio =
    totalBorrowRemaining > 0
      ? ((grandTotalReserveAssets / totalBorrowRemaining) * 100).toFixed(0)
      : '100';

  // Tỷ lệ bao phủ nợ CHỈ bằng Tiết Kiệm
  const savingsCoverageRatio =
    totalBorrowRemaining > 0
      ? ((totalSavingsAvailable / totalBorrowRemaining) * 100).toFixed(1)
      : '100';

  // =========================================================================
  // 4. BÁO CÁO KẾ HOẠCH TRẢ NỢ HÀNG THÁNG (AMORTIZATION & DEBT STRATEGY)
  // =========================================================================
  // Active (unpaid) borrow debts
  const activeBorrowDebts = borrowDebts.filter((d) => d.status !== 'paid' && d.remainingAmount > 0);

  // Helper tính số tháng còn lại
  const getMonthsRemaining = (dueDateStr?: string) => {
    if (!dueDateStr) return defaultHorizonMonths;
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    if (diffDays <= 0) return 0; // Quá hạn
    // Quy đổi ra tháng (khoảng 30.4 ngày/tháng)
    return Math.max(1, Math.round(diffDays / 30.4));
  };

  // Chi tiết từng khoản nợ cần trả hàng tháng
  const debtPlanItems = activeBorrowDebts.map((d) => {
    const monthsLeft = getMonthsRemaining(d.dueDate);
    const isOverdue = d.dueDate ? new Date(d.dueDate).getTime() < todayDate.getTime() : false;
    // Nếu quá hạn thì cần trả toàn bộ ngay lập tức trong tháng này
    const monthlyNeeded = isOverdue
      ? d.remainingAmount
      : Math.round(d.remainingAmount / Math.max(1, monthsLeft));

    return {
      debt: d,
      monthsLeft,
      isOverdue,
      monthlyNeeded,
    };
  });

  // TỔNG SỐ TIỀN CẦN TRẢ TRUNG BÌNH MỖI THÁNG
  const totalMonthlyNeeded = debtPlanItems.reduce((sum, item) => sum + item.monthlyNeeded, 0);

  // Dòng tiền thực tế từ Sổ Thu Chi (tính trung bình tháng hiện tại)
  const monthTransactions = transactions.filter((t) => t.date.startsWith(currentMonth));
  const currentMonthInflow = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthOutflow = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const currentMonthNetSurplus = currentMonthInflow - currentMonthOutflow;

  // Đánh giá kịch bản dòng tiền
  const isSurplusSufficient = currentMonthNetSurplus >= totalMonthlyNeeded;
  const monthlyDeficit = Math.max(0, totalMonthlyNeeded - Math.max(0, currentMonthNetSurplus));
  const monthsSavingsCanBuffer =
    monthlyDeficit > 0 && totalSavingsAvailable > 0
      ? Math.floor(totalSavingsAvailable / monthlyDeficit)
      : 0;

  // Filtered Debts List for Tab 1
  const isOverdueOrSoon = (d: DebtRecord) => {
    if (d.status === 'paid' || !d.dueDate) return false;
    const dueTime = new Date(d.dueDate).getTime();
    const nowTime = new Date(todayStr).getTime();
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 3600 * 24));
    return diffDays <= 7;
  };

  const filteredDebts = debts.filter((d) => {
    if (filterTab === 'lend' && d.type !== 'lend') return false;
    if (filterTab === 'borrow' && d.type !== 'borrow') return false;
    if (filterTab === 'due' && !isOverdueOrSoon(d)) return false;
    if (filterTab === 'paid' && d.status !== 'paid') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.personName.toLowerCase().includes(q);
      const matchPhone = d.phoneNumber?.includes(q);
      const matchDesc = d.description.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchDesc) return false;
    }

    return true;
  });

  // Handle Quick Add Debt
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim() || calculatedAmount <= 0) return;

    let dayNumber = parseInt(inputDay, 10);
    if (isNaN(dayNumber) || dayNumber < 1) dayNumber = 1;
    if (dayNumber > 31) dayNumber = 31;
    const formattedStartDate = `${inputMonthYear}-${String(dayNumber).padStart(2, '0')}`;

    onAddDebt({
      type: newType,
      personName: newPersonName.trim(),
      phoneNumber: newPhone.trim() || undefined,
      originalAmount: calculatedAmount,
      startDate: formattedStartDate,
      dueDate: newDueDate || undefined,
      description: newDescription.trim() || (newType === 'lend' ? 'Cho mượn tiền' : 'Khoản vay nợ'),
      accountId: newAccountId || undefined,
      note: newType === 'lend' ? 'Ghi nhận người khác nợ' : 'Ghi nhận khoản nợ cần trả',
    });

    setNewPersonName('');
    setNewPhone('');
    setInputRawAmount('');
    setNewDescription('');
    setNewDueDate('');
  };

  // Handle Payment Submit
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || calculatedPayAmount <= 0) return;

    onRecordPayment(payingDebt.id, {
      amount: calculatedPayAmount,
      date: payDate || todayStr,
      note: payNote.trim() || (payingDebt.type === 'lend' ? 'Thu nợ một phần' : 'Trả bớt một phần'),
    });

    setPayingDebt(null);
    setPayRawAmount('');
    setPayNote('');
  };

  // Open Edit Modal
  const handleOpenEdit = (debt: DebtRecord) => {
    setEditingDebt(debt);
    setEditPersonName(debt.personName);
    setEditPhone(debt.phoneNumber || '');
    setEditOriginalAmount(debt.originalAmount);
    setEditStartDate(debt.startDate);
    setEditDueDate(debt.dueDate || '');
    setEditDescription(debt.description);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt || !editPersonName.trim() || editOriginalAmount <= 0) return;

    const remaining = Math.max(0, editOriginalAmount - editingDebt.paidAmount);
    const newStatus: DebtStatus =
      remaining === 0 ? 'paid' : editingDebt.paidAmount > 0 ? 'partial' : 'unpaid';

    onEditDebt({
      ...editingDebt,
      personName: editPersonName.trim(),
      phoneNumber: editPhone.trim() || undefined,
      originalAmount: editOriginalAmount,
      remainingAmount: remaining,
      status: newStatus,
      startDate: editStartDate,
      dueDate: editDueDate || undefined,
      description: editDescription.trim(),
    });

    setEditingDebt(null);
  };

  // Open Asset Modal
  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setAssetName('');
    setAssetType('gold');
    setAssetQuantity('');
    setAssetRawValue('');
    setAssetLiquidity('high');
    setAssetNote('');
    setIsAssetModalOpen(true);
  };

  const handleOpenEditAsset = (asset: DebtAsset) => {
    setEditingAsset(asset);
    setAssetName(asset.name);
    setAssetType(asset.type);
    setAssetQuantity(asset.quantity || '');
    setAssetRawValue(String(asset.estimatedValue / 1000));
    setAssetLiquidity(asset.liquidity || 'high');
    setAssetNote(asset.note || '');
    setIsAssetModalOpen(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(assetRawValue) * 1000;
    if (!assetName.trim() || val <= 0) return;

    if (editingAsset) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === editingAsset.id
            ? {
                ...a,
                name: assetName.trim(),
                type: assetType,
                quantity: assetQuantity.trim() || undefined,
                estimatedValue: val,
                liquidity: assetLiquidity,
                note: assetNote.trim() || undefined,
              }
            : a
        )
      );
    } else {
      const newAsset: DebtAsset = {
        id: `asset-${Date.now()}`,
        name: assetName.trim(),
        type: assetType,
        quantity: assetQuantity.trim() || undefined,
        estimatedValue: val,
        liquidity: assetLiquidity,
        note: assetNote.trim() || undefined,
        createdAt: Date.now(),
      };
      setAssets((prev) => [newAsset, ...prev]);
    }

    setIsAssetModalOpen(false);
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài sản dự phòng này?')) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* TOP HEADER: 3 TABS ĐIỀU HƯỚNG CHÍNH                                       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-2 sm:p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Tab 1: Sổ Nợ */}
          <button
            type="button"
            onClick={() => setActiveMainTab('debts')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
              activeMainTab === 'debts'
                ? 'bg-gradient-to-r from-sky-700 to-indigo-800 text-white shadow-sm scale-101'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. Sổ Ghi Nợ Chi Tiết ({debts.length})</span>
          </button>

          {/* Tab 2: Quỹ Tiết Kiệm & Tài Sản */}
          <button
            type="button"
            onClick={() => setActiveMainTab('assets')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
              activeMainTab === 'assets'
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600 text-white shadow-sm scale-101'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <PiggyBank className="w-4 h-4 text-emerald-300" />
            <span>2. Quỹ Tiết Kiệm & Tài Sản (Vàng, BĐS)</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full font-bold">
              {assets.length + 1}
            </span>
          </button>

          {/* Tab 3: Báo Cáo Kế Hoạch Trả Nợ Hàng Tháng */}
          <button
            type="button"
            onClick={() => setActiveMainTab('report')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs ${
              activeMainTab === 'report'
                ? 'bg-gradient-to-r from-rose-700 via-purple-700 to-indigo-900 text-white shadow-sm scale-101'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-amber-300" />
            <span>3. Báo Cáo Trả Nợ Hàng Tháng</span>
            <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.2 rounded-full font-black uppercase">
              Hợp Lý
            </span>
          </button>
        </div>

        {/* Quick balance indicator */}
        <div className="hidden md:flex items-center gap-3 text-xs pr-2">
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tổng nợ cần trả</div>
            <div className="font-black text-rose-600">{formatCurrency(totalBorrowRemaining)}</div>
          </div>
          <div className="w-px h-7 bg-slate-200" />
          <div className="text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase">Tiết kiệm + Tài sản</div>
            <div className="font-black text-emerald-600">{formatCurrency(grandTotalReserveAssets)}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KPI CARDS: LUÔN HIỂN THỊ TỔNG QUAN                                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Tôi Đang Nợ (Borrow) */}
        <div className="bg-gradient-to-br from-rose-900 via-rose-800 to-rose-950 rounded-2xl p-3.5 text-white shadow-xs border border-rose-700/50">
          <div className="flex items-center justify-between text-xs font-bold text-rose-200 mb-1">
            <span className="flex items-center gap-1">
              <ArrowDownLeft className="w-3.5 h-3.5 text-rose-300" />
              Tôi Đang Nợ Cần Trả
            </span>
            <span className="text-[10px] bg-rose-500/40 px-2 py-0.5 rounded-full font-black">
              {activeBorrowDebts.length} khoản
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black tracking-tight text-white">
            {formatCurrency(totalBorrowRemaining)}
          </div>
          <div className="text-[11px] text-rose-200/80 mt-1 flex items-center justify-between">
            <span>Đã trả: {formatCurrency(totalBorrowPaid)}</span>
            <span>Gốc: {formatCurrency(totalBorrowOriginal)}</span>
          </div>
        </div>

        {/* Card 2: Quỹ Tiết Kiệm (Từ Sổ Thu Chi) */}
        <div className="bg-gradient-to-br from-teal-900 via-emerald-800 to-emerald-950 rounded-2xl p-3.5 text-white shadow-xs border border-emerald-700/50">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-200 mb-1">
            <span className="flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5 text-emerald-300" />
              Quỹ Tiết Kiệm (Sổ Thu Chi)
            </span>
            <span className="text-[10px] bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full font-black">
              Bao phủ {savingsCoverageRatio}%
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black tracking-tight text-emerald-100">
            {formatCurrency(totalSavingsAvailable)}
          </div>
          <div className="text-[11px] text-emerald-200/80 mt-1 flex items-center justify-between truncate">
            <span>Sẵn sàng trích trả nợ</span>
            <span className="underline cursor-pointer" onClick={() => setActiveMainTab('assets')}>
              Xem chi tiết ↗
            </span>
          </div>
        </div>

        {/* Card 3: Tài Sản Dự Phòng (Vàng, Bất Động Sản...) */}
        <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-yellow-950 rounded-2xl p-3.5 text-white shadow-xs border border-amber-700/50">
          <div className="flex items-center justify-between text-xs font-bold text-amber-200 mb-1">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-300" />
              Tài Sản (Vàng, BĐS...)
            </span>
            <span className="text-[10px] bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full font-black">
              {assets.length} tài sản
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black tracking-tight text-amber-100">
            {formatCurrency(totalOtherAssets)}
          </div>
          <div className="text-[11px] text-amber-200/80 mt-1 flex items-center justify-between">
            <span>Vàng: {formatCurrency(goldAssetsValue)}</span>
            <span>BĐS: {formatCurrency(realEstateAssetsValue)}</span>
          </div>
        </div>

        {/* Card 4: Kế Hoạch Cần Trả Trung Bình Mỗi Tháng */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 rounded-2xl p-3.5 text-white shadow-xs border border-indigo-700/50">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-200 mb-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-300" />
              Cần Trả TB / Tháng
            </span>
            <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-2 py-0.5 rounded-full font-bold">
              Theo hạn nợ
            </span>
          </div>
          <div className="text-lg sm:text-xl font-black tracking-tight text-amber-300">
            {formatCurrency(totalMonthlyNeeded)}
            <span className="text-xs font-semibold text-indigo-200">/tháng</span>
          </div>
          <div className="text-[11px] text-indigo-200/90 mt-1 flex items-center justify-between">
            <span>Thặng dư: {formatCurrency(Math.max(0, currentMonthNetSurplus))}/tháng</span>
            <span className="underline cursor-pointer" onClick={() => setActiveMainTab('report')}>
              Xem báo cáo ↗
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NỘI DUNG CHÍNH THEO TAB ĐANG CHỌN                                         */}
      {/* ========================================================================= */}

      {/* TAB 1: SỔ GHI NỢ CHI TIẾT */}
      {activeMainTab === 'debts' && (
        <div className="space-y-4">
          {/* Quick Add Form */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-600" />
                <span>Ghi Nhận Khoản Nợ Mới</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNewType('borrow')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    newType === 'borrow'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tôi Đi Vay (Cần Trả)
                </button>
                <button
                  type="button"
                  onClick={() => setNewType('lend')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    newType === 'lend'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Cho Vay (Cần Thu)
                </button>
              </div>
            </div>

            <form onSubmit={handleQuickAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Person Name */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    {newType === 'borrow' ? 'Tên Chủ Nợ / Người Cho Vay' : 'Tên Người Vay'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Ví dụ: Anh Tuấn, Ngân hàng VCB..."
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>

                {/* Amount */}
                <div className="sm:col-span-3">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-500">Số Tiền (VNĐ) *</label>
                    <label className="text-[10px] font-bold text-sky-700 cursor-pointer flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={autoAdd000}
                        onChange={(e) => setAutoAdd000(e.target.checked)}
                        className="rounded text-sky-600 focus:ring-0"
                      />
                      <span>+000</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={inputRawAmount}
                      onChange={(e) => setInputRawAmount(e.target.value)}
                      placeholder={autoAdd000 ? 'Ví dụ: 50000 (= 50 triệu)' : 'Ví dụ: 50000000'}
                      className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                    />
                    {calculatedAmount > 0 && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-black text-rose-600">
                        {formatCurrency(calculatedAmount)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Start Date */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Ngày Vay / Mượn</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={inputDay}
                      onChange={(e) => setInputDay(e.target.value)}
                      className="w-14 px-2 py-2 text-xs font-bold rounded-xl border border-slate-300 text-center bg-white"
                    />
                    <input
                      type="month"
                      value={inputMonthYear}
                      onChange={(e) => setInputMonthYear(e.target.value)}
                      className="flex-1 px-2.5 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                {/* Due Date (Repayment deadline) */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Hạn Chót Phải Trả (Rất quan trọng)
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Description & Account & Submit */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
                <div className="sm:col-span-6">
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Mục đích khoản nợ / Ghi chú chi tiết (ví dụ: Vay mua xe, mượn sửa nhà...)"
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <select
                    value={newAccountId}
                    onChange={(e) => setNewAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCurrency(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-700 to-indigo-800 hover:from-sky-600 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Lưu Khoản Nợ</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Filter Bar & Search */}
          <div className="bg-white rounded-2xl p-3 shadow-xs border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Tất Cả (${debts.length})` },
                { id: 'borrow', label: `Tôi Nợ (${borrowDebts.length})`, color: 'text-rose-700' },
                { id: 'lend', label: `Người Khác Nợ (${lendDebts.length})`, color: 'text-emerald-700' },
                { id: 'due', label: 'Sắp Đến Hạn / Quá Hạn', color: 'text-amber-700' },
                { id: 'paid', label: 'Đã Xong 100%' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterTab === tab.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span className={filterTab === tab.id ? 'text-white' : tab.color}>
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, SĐT, nội dung..."
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* List of Debts */}
          {filteredDebts.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs italic">
              Chưa có khoản nợ nào trong danh mục này.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredDebts.map((debt) => {
                const isBorrow = debt.type === 'borrow';
                const isExpanded = !!expandedHistories[debt.id];
                const isOverdue = debt.dueDate ? new Date(debt.dueDate).getTime() < todayDate.getTime() : false;

                return (
                  <div
                    key={debt.id}
                    className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${
                      debt.status === 'paid'
                        ? 'border-emerald-200 bg-emerald-50/20 opacity-80'
                        : isBorrow
                        ? 'border-rose-200 hover:border-rose-400'
                        : 'border-emerald-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Person Info & Status */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                            isBorrow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isBorrow ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900 truncate">
                              {debt.personName}
                            </span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isBorrow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isBorrow ? 'Tôi nợ người này' : 'Người này nợ tôi'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{debt.description}</span>
                            <span>• Ngày vay: {formatFriendlyDate(debt.startDate)}</span>
                            {debt.dueDate && (
                              <span
                                className={`font-bold ${
                                  isOverdue ? 'text-rose-600 font-black' : 'text-amber-700'
                                }`}
                              >
                                • Hạn: {formatFriendlyDate(debt.dueDate)} {isOverdue && '(Quá hạn)'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Amounts & Quick Actions */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Còn lại phải trả/thu</div>
                          <div
                            className={`text-base sm:text-lg font-black tracking-tight ${
                              isBorrow ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatCurrency(debt.remainingAmount)}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Đã trả: {formatCurrency(debt.paidAmount)} / Gốc: {formatCurrency(debt.originalAmount)}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {debt.status !== 'paid' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingDebt(debt);
                                setPayRawAmount('');
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-black text-white shadow-xs transition-transform hover:scale-102 active:scale-98 ${
                                isBorrow
                                  ? 'bg-rose-600 hover:bg-rose-500'
                                  : 'bg-emerald-600 hover:bg-emerald-500'
                              }`}
                            >
                              {isBorrow ? 'Trả Bớt' : 'Thu Nợ'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(debt)}
                            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title="Sửa khoản nợ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Xác nhận xóa khoản nợ của ${debt.personName}?`)) {
                                onDeleteDebt(debt.id);
                              }
                            }}
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Xóa khoản nợ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Payments History Toggle */}
                    {debt.payments && debt.payments.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleHistory(debt.id)}
                          className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                        >
                          <span>Lịch sử các lần thanh toán ({debt.payments.length} lần)</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-sky-300">
                            {debt.payments.map((p) => (
                              <div
                                key={p.id}
                                className="text-xs text-slate-600 flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded-lg"
                              >
                                <div>
                                  <span className="font-bold text-slate-800">{formatFriendlyDate(p.date)}</span>
                                  <span className="text-slate-400 ml-2">• {p.note || 'Thanh toán'}</span>
                                </div>
                                <span className="font-black text-emerald-600">
                                  +{formatCurrency(p.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUỸ TIẾT KIỆM TỪ SỔ THU CHI & TÀI SẢN KHÁC (VÀNG, BẤT ĐỘNG SẢN)     */}
      {/* ========================================================================= */}
      {activeMainTab === 'assets' && (
        <div className="space-y-4">
          {/* KHỐI 1: QUỸ TIẾT KIỆM LIÊN KẾT TỪ SỔ THU CHI */}
          <div className="bg-gradient-to-br from-teal-950 via-emerald-900 to-sky-950 rounded-3xl p-5 text-white shadow-md border border-emerald-500/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 font-black shadow-inner">
                  <PiggyBank className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight flex items-center gap-2">
                    <span>Quỹ Tiết Kiệm Tích Lũy (Từ Sổ Thu Chi)</span>
                    <span className="text-[10px] bg-emerald-400 text-emerald-950 px-2 py-0.5 rounded-full font-black uppercase">
                      Tự Động Liên Kết
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-200/90 font-medium">
                    Nguồn tiền nhàn rỗi tích lũy từ các giao dịch chuyển tiền vào Mục Tiết Kiệm bên sổ thu chi
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-bold text-emerald-300 uppercase">Tổng tiền tiết kiệm sẵn sàng</div>
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {formatCurrency(totalSavingsAvailable)}
                </div>
              </div>
            </div>

            {/* Phân tích khả năng sử dụng tiết kiệm trả dần nợ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="text-[11px] font-bold text-emerald-200">Tổng Nợ Cần Trả (Borrow)</div>
                <div className="text-lg font-black text-rose-300 mt-0.5">
                  {formatCurrency(totalBorrowRemaining)}
                </div>
                <div className="text-[10px] text-emerald-100/70 mt-1">Cần thanh toán dần</div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <div className="text-[11px] font-bold text-emerald-200">Tỷ Lệ Tiết Kiệm / Nợ</div>
                <div className="text-lg font-black text-emerald-300 mt-0.5">
                  {savingsCoverageRatio}%
                </div>
                <div className="text-[10px] text-emerald-100/70 mt-1">
                  {Number(savingsCoverageRatio) >= 100
                    ? 'Đủ tiền tiết kiệm trả hết nợ'
                    : `Trả được ${savingsCoverageRatio}% nợ`}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-emerald-200">Thao Tác Nhanh</div>
                  <div className="text-[11px] text-emerald-100/80 mt-0.5">
                    Trích tiền tiết kiệm để trả ngay một khoản nợ
                  </div>
                </div>
                {activeBorrowDebts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayingDebt(activeBorrowDebts[0]);
                      setPayRawAmount(String(Math.min(totalSavingsAvailable, activeBorrowDebts[0].remainingAmount) / 1000));
                      setPayNote('Trích từ Quỹ Tiết Kiệm Sổ Thu Chi');
                    }}
                    className="mt-2 w-full py-1.5 px-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Trích Tiết Kiệm Trả Nợ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Danh sách các lần chuyển vào Tiết Kiệm gần đây */}
            {savingsTransfers.length > 0 && (
              <div className="pt-2 border-t border-emerald-800/80 text-xs">
                <div className="font-bold text-emerald-200 mb-1.5 flex items-center justify-between">
                  <span>Lịch sử chuyển vào Tiết Kiệm bên Sổ Thu Chi:</span>
                  <span className="text-[11px] text-emerald-300">{savingsTransfers.length} giao dịch</span>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  {savingsTransfers.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2 rounded-xl bg-black/20 flex items-center justify-between text-[11px]"
                    >
                      <div className="truncate mr-2">
                        <span className="font-bold text-emerald-200">{formatFriendlyDate(tx.date)}: </span>
                        <span>{tx.description}</span>
                      </div>
                      <span className="font-black text-emerald-300 shrink-0">
                        +{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KHỐI 2: DANH MỤC CÁC TÀI SẢN KHÁC (VÀNG, BẤT ĐỘNG SẢN, CỔ PHIẾU...) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-500" />
                  <span>Danh Mục Tài Sản Dự Phòng (Vàng, Bất Động Sản...)</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Tự thêm các tài sản hiện có để hệ thống tự động tính toán cân đối và gợi ý bán khi cần trả nợ gấp
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddAsset}
                className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Tài Sản Mới (Vàng, BĐS...)</span>
              </button>
            </div>

            {/* Bảng cân đối an toàn tài sản / nợ */}
            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-amber-950 uppercase tracking-wide">
                    Hệ Số Cân Đối Tài Sản / Nợ: {assetCoverageRatio}%
                  </div>
                  <div className="text-xs text-amber-900 font-medium">
                    Tổng tài sản (Tiết kiệm + Vàng + BĐS) ={' '}
                    <strong>{formatCurrency(grandTotalReserveAssets)}</strong> so với Tổng nợ{' '}
                    <strong>{formatCurrency(totalBorrowRemaining)}</strong>
                  </div>
                </div>
              </div>

              <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-950 shadow-2xs">
                {Number(assetCoverageRatio) >= 150 ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    Tài sản đảm bảo rất an toàn (Thừa bù đắp)
                  </span>
                ) : Number(assetCoverageRatio) >= 100 ? (
                  <span className="text-teal-700">Tài sản vừa đủ bao phủ toàn bộ nợ</span>
                ) : (
                  <span className="text-rose-700 font-black">Cảnh báo: Nợ đang vượt quá tài sản dự phòng!</span>
                )}
              </div>
            </div>

            {/* Danh sách các tài sản */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assets.map((asset) => {
                const isGold = asset.type === 'gold';
                const isRE = asset.type === 'real_estate';

                return (
                  <div
                    key={asset.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 transition-all shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                              isGold
                                ? 'bg-amber-100 text-amber-800'
                                : isRE
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {isGold ? <Coins className="w-5 h-5" /> : isRE ? <Building2 className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                          </div>

                          <div>
                            <div className="font-black text-sm text-slate-900">{asset.name}</div>
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                              {asset.quantity && <span className="font-bold text-slate-700">{asset.quantity}</span>}
                              <span>•</span>
                              <span
                                className={`font-bold ${
                                  asset.liquidity === 'high'
                                    ? 'text-emerald-600'
                                    : asset.liquidity === 'medium'
                                    ? 'text-amber-600'
                                    : 'text-slate-500'
                                }`}
                              >
                                {asset.liquidity === 'high'
                                  ? '⚡ Bán nhanh trong ngày'
                                  : asset.liquidity === 'medium'
                                  ? '⏳ Bán trong 1-3 tuần'
                                  : '🐢 Cần 1-3 tháng để bán'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditAsset(asset)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            title="Sửa tài sản"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa tài sản"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {asset.note && (
                        <p className="text-[11px] text-slate-500 mt-2 bg-white p-2 rounded-xl border border-slate-100 italic">
                          &quot;{asset.note}&quot;
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-400">Giá trị ước tính:</span>
                      <span className="text-base font-black text-amber-700 tracking-tight">
                        {formatCurrency(asset.estimatedValue)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BÁO CÁO KẾ HOẠCH TRẢ NỢ HÀNG THÁNG (AMORTIZATION STRATEGY REPORT)   */}
      {/* ========================================================================= */}
      {activeMainTab === 'report' && (
        <div className="space-y-4">
          {/* Header Báo Cáo */}
          <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-5 text-white shadow-md border border-indigo-500/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg tracking-tight">
                    Báo Cáo Kế Hoạch Trả Nợ Hàng Tháng
                  </h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    Tính toán số tiền trung bình 1 tháng cần chuẩn bị dựa theo thời gian và hạn trả từng khoản nợ
                  </p>
                </div>
              </div>

              {/* Setting target horizon */}
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-2xl border border-white/15 text-xs">
                <span className="text-indigo-200 font-medium">Kế hoạch cho khoản không ghi hạn:</span>
                <select
                  value={defaultHorizonMonths}
                  onChange={(e) => setDefaultHorizonMonths(Number(e.target.value) || 12)}
                  className="bg-indigo-950 text-white font-bold rounded-lg px-2 py-1 border border-indigo-400/40 focus:outline-none"
                >
                  <option value={6}>Trả trong 6 tháng</option>
                  <option value={12}>Trả trong 12 tháng (1 năm)</option>
                  <option value={24}>Trả trong 24 tháng (2 năm)</option>
                  <option value={36}>Trả trong 36 tháng (3 năm)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3 Thẻ Đánh Giá Dòng Tiền & Tính Khả Thi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Thẻ 1: Cần Trả Hàng Tháng */}
            <div className="bg-white rounded-2xl p-4 border-2 border-indigo-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Trung Bình 1 Tháng Cần Chuẩn Bị
              </div>
              <div className="text-xl sm:text-2xl font-black text-rose-600 mt-1">
                {formatCurrency(totalMonthlyNeeded)}
                <span className="text-xs font-bold text-slate-400 ml-1">/tháng</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Để trả dứt điểm {activeBorrowDebts.length} khoản nợ đúng hạn
              </div>
            </div>

            {/* Thẻ 2: Dòng Tiền Thặng Dư Hiện Có */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Tiền Dư Hàng Tháng (Sổ Thu Chi)
              </div>
              <div
                className={`text-xl sm:text-2xl font-black mt-1 ${
                  currentMonthNetSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {formatCurrency(currentMonthNetSurplus)}
                <span className="text-xs font-bold text-slate-400 ml-1">/tháng</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Thu ngoài ({formatCurrency(currentMonthInflow)}) - Chi ({formatCurrency(currentMonthOutflow)})
              </div>
            </div>

            {/* Thẻ 3: Đánh Giá Tính Hợp Lý & Khả Thi */}
            <div
              className={`rounded-2xl p-4 border-2 shadow-xs ${
                isSurplusSufficient
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : monthlyDeficit > 0 && monthsSavingsCanBuffer > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="text-xs font-bold uppercase tracking-wide">
                {isSurplusSufficient
                  ? '🟢 Kế Hoạch Hoàn Toàn Khả Thi'
                  : monthlyDeficit > 0 && monthsSavingsCanBuffer > 0
                  ? '🟡 Cần Bù Đắp Từ Tiết Kiệm'
                  : '🔴 Cần Cân Đối Bán Tài Sản'}
              </div>
              <div className="text-base font-black mt-1">
                {isSurplusSufficient ? (
                  <span>Dư {formatCurrency(currentMonthNetSurplus - totalMonthlyNeeded)}/tháng</span>
                ) : (
                  <span>Thiếu hụt {formatCurrency(monthlyDeficit)}/tháng</span>
                )}
              </div>
              <div className="text-[11px] mt-1 font-medium leading-snug">
                {isSurplusSufficient ? (
                  'Thu nhập hàng tháng đủ để trả nợ và vẫn còn tích lũy thêm!'
                ) : monthsSavingsCanBuffer > 0 ? (
                  `Quỹ tiết kiệm (${formatCurrency(totalSavingsAvailable)}) đủ bù đắp trong ${monthsSavingsCanBuffer} tháng!`
                ) : (
                  'Cần cắt giảm chi tiêu hoặc bán bớt Vàng để trả trước gốc.'
                )}
              </div>
            </div>
          </div>

          {/* Bảng Kế Hoạch Chi Tiết Từng Khoản Nợ */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="font-black text-sm text-slate-800 uppercase tracking-wide flex items-center justify-between">
              <span>Chi Tiết Phân Bổ Trả Nợ Từng Khoản</span>
              <span className="text-xs text-slate-500 font-medium">
                Xếp theo thời hạn & mức độ ưu tiên
              </span>
            </h4>

            {activeBorrowDebts.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                Tuyệt vời! Bạn hiện tại không có khoản nợ nào cần phải trả.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Khoản Nợ & Chủ Nợ</th>
                      <th className="py-3 px-4">Số Tiền Còn Nợ</th>
                      <th className="py-3 px-4">Hạn Trả</th>
                      <th className="py-3 px-4">Thời Gian Còn Lại</th>
                      <th className="py-3 px-4 text-rose-700 font-black">Cần Trả TB / Tháng</th>
                      <th className="py-3 px-4">Gợi Ý Nguồn Tiền</th>
                      <th className="py-3 px-3 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debtPlanItems.map(({ debt, monthsLeft, isOverdue, monthlyNeeded }) => (
                      <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">{debt.personName}</div>
                          <div className="text-[11px] text-slate-500">{debt.description}</div>
                        </td>

                        <td className="py-3 px-4 font-black text-sm text-rose-600">
                          {formatCurrency(debt.remainingAmount)}
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {debt.dueDate ? formatFriendlyDate(debt.dueDate) : 'Chưa đặt hạn'}
                        </td>

                        <td className="py-3 px-4">
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              Đã Quá Hạn
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                              Còn khoảng {monthsLeft} tháng
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <span className="text-sm font-black text-rose-700">
                            {formatCurrency(monthlyNeeded)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold block">/tháng</span>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-600">
                          {isOverdue ? (
                            <span className="font-bold text-rose-700">
                              ⚡ Ưu tiên trả ngay từ Quỹ Tiết Kiệm
                            </span>
                          ) : monthlyNeeded <= currentMonthNetSurplus ? (
                            <span className="text-emerald-700 font-bold">
                              Trích từ thu nhập hàng tháng
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold">
                              Kết hợp Tiết Kiệm hoặc bán Vàng
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setPayingDebt(debt);
                              setPayRawAmount(String(monthlyNeeded / 1000));
                              setPayNote(`Trả góp định kỳ tháng (${formatCurrency(monthlyNeeded)})`);
                            }}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors"
                          >
                            Trả Đợt Này
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: GHI NHẬN THANH TOÁN (PAYMENT MODAL)                             */}
      {/* ========================================================================= */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold ${
                    payingDebt.type === 'borrow' ? 'bg-rose-600' : 'bg-emerald-600'
                  }`}
                >
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800">
                    {payingDebt.type === 'borrow' ? 'Ghi Nhận Trả Nợ' : 'Ghi Nhận Thu Nợ'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Đối tác: {payingDebt.personName}</p>
                </div>
              </div>
              <button
                onClick={() => setPayingDebt(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-bold">Số nợ còn lại:</span>
              <span className="font-black text-rose-600 text-sm">
                {formatCurrency(payingDebt.remainingAmount)}
              </span>
            </div>

            {/* Quick helper to deduct from Savings fund */}
            {payingDebt.type === 'borrow' && totalSavingsAvailable > 0 && (
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between gap-2">
                <div className="truncate">
                  <span className="font-bold text-emerald-900">Quỹ Tiết Kiệm: </span>
                  <span className="font-black text-emerald-700">{formatCurrency(totalSavingsAvailable)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const fillVal = Math.min(totalSavingsAvailable, payingDebt.remainingAmount);
                    setPayRawAmount(String(fillVal / 1000));
                    setPayNote('Trích từ Quỹ Tiết Kiệm');
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs shrink-0"
                >
                  Trích Tiết Kiệm
                </button>
              </div>
            )}

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-600">Số tiền trả đợt này (VNĐ) *</label>
                  <label className="text-[10px] font-bold text-sky-700 cursor-pointer flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={payAutoAdd000}
                      onChange={(e) => setPayAutoAdd000(e.target.checked)}
                      className="rounded text-sky-600 focus:ring-0"
                    />
                    <span>+000</span>
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="1"
                    max={payingDebt.remainingAmount}
                    value={payRawAmount}
                    onChange={(e) => setPayRawAmount(e.target.value)}
                    placeholder="Ví dụ: 5000 (= 5 triệu)"
                    className="w-full px-3 py-2 text-xs font-black rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 bg-white"
                  />
                  {calculatedPayAmount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-600">
                      {formatCurrency(calculatedPayAmount)}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ngày thanh toán</label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi chú đợt thanh toán</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="Ví dụ: Trả đợt 1 qua chuyển khoản, trích tiết kiệm..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs"
                >
                  Xác Nhận Thanh Toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THÊM / SỬA TÀI SẢN DỰ PHÒNG (VÀNG, BẤT ĐỘNG SẢN...)            */}
      {/* ========================================================================= */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-800">
                    {editingAsset ? 'Chỉnh Sửa Tài Sản' : 'Thêm Tài Sản Dự Phòng'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Khai báo Vàng, Bất động sản, Cổ phiếu...</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssetModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Loại Tài Sản *</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                >
                  <option value="gold">🟡 Tài sản Vàng (Nhẫn, SJC, Vàng 9999)</option>
                  <option value="real_estate">🏠 Bất Động Sản (Nhà đất, Căn hộ, Đất nền)</option>
                  <option value="stock">📈 Cổ Phiếu / Chứng Khoán / Đầu Tư</option>
                  <option value="vehicle">🚗 Xe Cộ / Phương Tiện Giá Trị</option>
                  <option value="other">💎 Tài Sản Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên Tài Sản *</label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Ví dụ: 3 Lượng Vàng SJC, Căn hộ Times City..."
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Số Lượng</label>
                  <input
                    type="text"
                    value={assetQuantity}
                    onChange={(e) => setAssetQuantity(e.target.value)}
                    placeholder="Ví dụ: 2 cây, 100m2..."
                    className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Giá Trị Ước Tính (nghìn đ)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={assetRawValue}
                    onChange={(e) => setAssetRawValue(e.target.value)}
                    placeholder="170000 (= 170 tr)"
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Khả Năng Bán Nhanh (Thanh Khoản)</label>
                <select
                  value={assetLiquidity}
                  onChange={(e) => setAssetLiquidity(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white"
                >
                  <option value="high">⚡ Bán nhanh trong ngày (Như Vàng, tiền gửi)</option>
                  <option value="medium">⏳ Cần 1-3 tuần (Cổ phiếu, xe cộ)</option>
                  <option value="low">🐢 Cần 1-3 tháng hoặc lâu hơn (Bất động sản)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ghi Chú Kế Hoạch Bán</label>
                <input
                  type="text"
                  value={assetNote}
                  onChange={(e) => setAssetNote(e.target.value)}
                  placeholder="Ví dụ: Đang gửi két sắt, sẵn sàng bán khi nợ đến hạn..."
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssetModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
                >
                  {editingAsset ? 'Cập Nhật Tài Sản' : 'Lưu Tài Sản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SỬA KHOẢN NỢ (EDIT DEBT MODAL)                                   */}
      {/* ========================================================================= */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-black text-sm text-slate-800">Sửa Thông Tin Khoản Nợ</h4>
              <button
                onClick={() => setEditingDebt(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tên đối tác</label>
                <input
                  type="text"
                  required
                  value={editPersonName}
                  onChange={(e) => setEditPersonName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Số tiền gốc (VNĐ)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editOriginalAmount}
                  onChange={(e) => setEditOriginalAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Hạn trả</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nội dung / Mô tả</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black rounded-xl bg-sky-700 hover:bg-sky-600 text-white shadow-xs"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
