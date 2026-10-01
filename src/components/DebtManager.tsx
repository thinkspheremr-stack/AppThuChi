import React, { useState } from 'react';
import { Account, DebtPayment, DebtRecord, DebtStatus, DebtType } from '../types';
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
} from 'lucide-react';

interface DebtManagerProps {
  debts: DebtRecord[];
  accounts: Account[];
  onAddDebt: (debt: Omit<DebtRecord, 'id' | 'createdAt' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments'>) => void;
  onEditDebt: (debt: DebtRecord) => void;
  onDeleteDebt: (id: string) => void;
  onRecordPayment: (debtId: string, payment: Omit<DebtPayment, 'id' | 'createdAt'>) => void;
  onMarkAsPaid: (debtId: string) => void;
}

export const DebtManager: React.FC<DebtManagerProps> = ({
  debts,
  accounts,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onRecordPayment,
  onMarkAsPaid,
}) => {
  // Filter tab: 'all' | 'lend' | 'borrow' | 'due' | 'paid'
  const [filterTab, setFilterTab] = useState<'all' | 'lend' | 'borrow' | 'due' | 'paid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick inline add form state
  const [newType, setNewType] = useState<DebtType>('lend'); // 'lend': Người khác nợ tôi, 'borrow': Tôi nợ người khác
  const [newPersonName, setNewPersonName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [inputRawAmount, setInputRawAmount] = useState('');
  const [autoAdd000, setAutoAdd000] = useState(true);
  const [inputDay, setInputDay] = useState(String(new Date().getDate()));
  const [inputMonthYear, setInputMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
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

  const toggleHistory = (debtId: string) => {
    setExpandedHistories((prev) => ({ ...prev, [debtId]: !prev[debtId] }));
  };

  // Calculated amount for quick add
  const rawNum = Number(inputRawAmount) || 0;
  const calculatedAmount = autoAdd000 ? rawNum * 1000 : rawNum;

  // Calculated amount for payment modal
  const rawPayNum = Number(payRawAmount) || 0;
  const calculatedPayAmount = payAutoAdd000 ? rawPayNum * 1000 : rawPayNum;

  // =========================================================================
  // DẢI CHỈ SỐ BÁO CÁO GHI NỢ (DEBT KPI REPORT METRICS)
  // =========================================================================
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Khoản người khác nợ tôi (lend):
  const lendDebts = debts.filter((d) => d.type === 'lend');
  const totalLendOriginal = lendDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalLendPaid = lendDebts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalLendRemaining = lendDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  // 2. Khoản tôi đang nợ người khác (borrow):
  const borrowDebts = debts.filter((d) => d.type === 'borrow');
  const totalBorrowOriginal = borrowDebts.reduce((sum, d) => sum + d.originalAmount, 0);
  const totalBorrowPaid = borrowDebts.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalBorrowRemaining = borrowDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  // 3. Cân đối nợ ròng (Tài sản ròng từ nợ = Cần thu - Cần trả)
  const netDebtBalance = totalLendRemaining - totalBorrowRemaining;

  // 4. Khoản quá hạn & sắp đến hạn (trong vòng 7 ngày)
  const isOverdueOrSoon = (d: DebtRecord) => {
    if (d.status === 'paid' || !d.dueDate) return false;
    const dueTime = new Date(d.dueDate).getTime();
    const nowTime = new Date(todayStr).getTime();
    const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 3600 * 24));
    return diffDays <= 7; // Quá hạn hoặc còn dưới 7 ngày
  };

  const dueDebts = debts.filter(isOverdueOrSoon);
  const totalDueRemaining = dueDebts.reduce((sum, d) => sum + d.remainingAmount, 0);

  // 5. Đã hoàn tất 100%
  const completedDebts = debts.filter((d) => d.status === 'paid');
  const totalCompletedAmount = completedDebts.reduce((sum, d) => sum + d.originalAmount, 0);

  // Filtered List
  const filteredDebts = debts.filter((d) => {
    // Tab filter
    if (filterTab === 'lend' && d.type !== 'lend') return false;
    if (filterTab === 'borrow' && d.type !== 'borrow') return false;
    if (filterTab === 'due' && !isOverdueOrSoon(d)) return false;
    if (filterTab === 'paid' && d.status !== 'paid') return false;

    // Search filter
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
      description: newDescription.trim() || (newType === 'lend' ? 'Cho mượn tiền' : 'Vay mượn tiền'),
      accountId: newAccountId || undefined,
      note: newType === 'lend' ? 'Ghi nhận người khác nợ' : 'Ghi nhận khoản vay nợ',
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

  // Save Edit
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

  // Helper check status text & color
  const getStatusBadge = (debt: DebtRecord) => {
    if (debt.status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Đã xong 100%
        </span>
      );
    }

    // Check overdue
    if (debt.dueDate) {
      const dueTime = new Date(debt.dueDate).getTime();
      const nowTime = new Date(todayStr).getTime();
      const diffDays = Math.ceil((dueTime - nowTime) / (1000 * 3600 * 24));
      if (diffDays < 0) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Quá hạn {Math.abs(diffDays)} ngày
          </span>
        );
      }
      if (diffDays <= 7) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" />
            Còn {diffDays} ngày tới hạn
          </span>
        );
      }
    }

    if (debt.status === 'partial') {
      const percent = Math.round((debt.paidAmount / debt.originalAmount) * 100);
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
          <Clock className="w-3 h-3 text-sky-600" />
          Đã trả {percent}%
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        Chưa thanh toán
      </span>
    );
  };

  return (
    <div className="space-y-6 mb-8 animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* 1. HEADER SỔ GHI NỢ                                                       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 shadow-sm border border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  SỔ GHI NỢ & CHO VAY
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#bde0fe] text-blue-950 border border-sky-300">
                  {debts.length} Khoản nợ
                </span>
              </div>
              <p className="text-xs text-sky-200/80 mt-0.5">
                Theo dõi chi tiết tiền cho mượn (cần thu) và tiền đi vay (cần trả), lịch sử trả nợ từng đợt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Cân đối nợ ròng</span>
              <div
                className={`text-base font-black ${
                  netDebtBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {netDebtBalance >= 0 ? '+' : ''}
                {formatCurrency(netDebtBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DẢI CHỈ SỐ BÁO CÁO GHI NỢ (DEBT REPORT METRICS BAR)                     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-700/60 text-xs">
          {/* Cột 1: Người khác nợ tôi */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-emerald-500/30">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
              <ArrowDownLeft className="w-3.5 h-3.5" />
              NGƯỜI KHÁC NỢ TÔI (CẦN THU)
            </div>
            <div className="text-lg font-black text-emerald-300 tracking-tight">
              +{formatCurrency(totalLendRemaining)}
            </div>
            <div className="text-[10px] text-slate-300 mt-1 flex justify-between">
              <span>Gốc: {formatCurrency(totalLendOriginal)}</span>
              <span className="text-emerald-400">Đã thu: {formatCurrency(totalLendPaid)}</span>
            </div>
          </div>

          {/* Cột 2: Tôi đang nợ */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-rose-500/30">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] mb-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              TÔI ĐANG NỢ (CẦN TRẢ)
            </div>
            <div className="text-lg font-black text-rose-300 tracking-tight">
              -{formatCurrency(totalBorrowRemaining)}
            </div>
            <div className="text-[10px] text-slate-300 mt-1 flex justify-between">
              <span>Gốc: {formatCurrency(totalBorrowOriginal)}</span>
              <span className="text-rose-400">Đã trả: {formatCurrency(totalBorrowPaid)}</span>
            </div>
          </div>

          {/* Cột 3: Cân đối nợ ròng */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-indigo-500/30">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[11px] mb-1">
              <ArrowRightLeft className="w-3.5 h-3.5" />
              CÂN ĐỐI NỢ RÒNG
            </div>
            <div
              className={`text-lg font-black tracking-tight ${
                netDebtBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netDebtBalance >= 0 ? '+' : ''}
              {formatCurrency(netDebtBalance)}
            </div>
            <div className="text-[10px] text-slate-300 mt-1">
              {netDebtBalance >= 0 ? '🟢 Bạn đang là chủ nợ ròng' : '🔴 Bạn đang nợ nhiều hơn'}
            </div>
          </div>

          {/* Cột 4: Quá hạn & Sắp đến hạn */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-amber-500/30">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-1">
              <BadgeAlert className="w-3.5 h-3.5" />
              SẮP HẠN & QUÁ HẠN
            </div>
            <div className="text-lg font-black text-amber-300 tracking-tight">
              {formatCurrency(totalDueRemaining)}
            </div>
            <div className="text-[10px] text-amber-200 mt-1">
              {dueDebts.length} khoản cần thanh toán ngay
            </div>
          </div>

          {/* Cột 5: Đã hoàn tất */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-600/40 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ĐÃ XONG HOÀN TOÀN
            </div>
            <div className="text-lg font-black text-slate-200 tracking-tight">
              {formatCurrency(totalCompletedAmount)}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              {completedDebts.length} khoản nợ đã thanh toán 100%
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DÒNG NHẬP NHANH KHOẢN NỢ MỚI (INLINE QUICK ENTRY)                       */}
      {/* ========================================================================= */}
      <form
        onSubmit={handleQuickAdd}
        className="bg-white p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/80 shadow-sm space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-indigo-600" />
              Ghi nhanh khoản nợ mới:
            </span>

            {/* Toggle Loại Nợ: Cho vay (Người ta nợ) vs Đi vay (Tôi nợ) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setNewType('lend')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  newType === 'lend'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🟢 Cho Mượn (Người ta nợ tôi)
              </button>
              <button
                type="button"
                onClick={() => setNewType('borrow')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  newType === 'borrow'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                🔴 Đi Vay (Tôi nợ người khác)
              </button>
            </div>
          </div>

          {/* Toggle tự động thêm 000 */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Tự động thêm 000:</span>
            <button
              type="button"
              onClick={() => setAutoAdd000(!autoAdd000)}
              className={`px-2 py-0.5 rounded-md font-bold text-[11px] transition-colors ${
                autoAdd000
                  ? 'bg-emerald-500 text-white shadow-2xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {autoAdd000 ? 'BẬT (Gõ 100 = 100k)' : 'TẮT'}
            </button>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-1">
          {/* Cột 1: Tên Người nợ / Chủ nợ */}
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {newType === 'lend' ? 'Người nợ (Ai mượn tiền bạn?)' : 'Chủ nợ (Bạn mượn của ai?)'} *
            </label>
            <input
              type="text"
              required
              placeholder="Tên người, đồng nghiệp, bạn bè..."
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Cột 2: Số điện thoại */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              placeholder="0912..."
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Cột 3: Số tiền */}
          <div className="sm:col-span-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">
                Số tiền nợ *
              </label>
              <span className="text-[10px] text-amber-600 font-bold">
                {rawNum > 0 ? `= ${formatCurrency(calculatedAmount)}` : autoAdd000 ? '+ 000' : ''}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="any"
                required
                placeholder={autoAdd000 ? '100 (100.000đ)' : '100000'}
                value={inputRawAmount}
                onChange={(e) => setInputRawAmount(e.target.value)}
                className={`w-full px-3 py-2 pr-10 rounded-xl border border-slate-200 text-xs font-black focus:outline-none focus:ring-2 ${
                  newType === 'lend'
                    ? 'text-emerald-700 focus:ring-emerald-500/20 focus:border-emerald-500'
                    : 'text-rose-700 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                {autoAdd000 ? 'k' : 'đ'}
              </span>
            </div>
          </div>

          {/* Cột 4: Hạn trả */}
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Hạn trả (Đáo hạn)
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Cột 5: Nút Ghi Nợ */}
          <div className="sm:col-span-2">
            <button
              type="submit"
              className={`w-full py-2 px-3 rounded-xl text-xs font-black text-white shadow-sm transition-all flex items-center justify-center gap-1.5 hover:scale-102 active:scale-98 ${
                newType === 'lend'
                  ? 'bg-emerald-600 hover:bg-emerald-500 ring-2 ring-emerald-400/30'
                  : 'bg-rose-600 hover:bg-rose-500 ring-2 ring-rose-400/30'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{newType === 'lend' ? 'Ghi Cho Mượn' : 'Ghi Đi Vay'}</span>
            </button>
          </div>
        </div>

        {/* Dòng bổ sung: Nội dung & Tài khoản giải ngân */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          <div className="sm:col-span-8">
            <input
              type="text"
              placeholder="Lý do / Mục đích: Mượn tiền sửa xe, đóng học phí, mua thiết bị..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              Tài khoản liên quan:
            </span>
            <select
              value={newAccountId}
              onChange={(e) => setNewAccountId(e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* 4. BẢNG REPORT GHI NỢ CHI TIẾT (DEBT REPORT TABLE)                        */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Table Filter Tabs & Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Tất Cả (${debts.length})` },
              { id: 'lend', label: `Người Khác Nợ Tôi (${lendDebts.length})`, color: 'text-emerald-700' },
              { id: 'borrow', label: `Tôi Đang Nợ (${borrowDebts.length})`, color: 'text-rose-700' },
              { id: 'due', label: `Sắp Hạn / Quá Hạn (${dueDebts.length})`, color: 'text-amber-800' },
              { id: 'paid', label: `Đã Xong (${completedDebts.length})` },
            ].map((tab) => {
              const isActive = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span className={isActive ? 'text-white' : tab.color}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, lý do..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Ngày Vay & Hạn Trả</th>
                <th className="py-3 px-4">Đối Tác & Phân Loại</th>
                <th className="py-3 px-4 text-right">Số Tiền Gốc</th>
                <th className="py-3 px-4 text-right">Đã Trả / Thu</th>
                <th className="py-3 px-4 text-right">Còn Lại</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4">Lý Do & Ghi Chú</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                    Chưa có khoản nợ nào trong danh mục này. Hãy sử dụng form ở trên để ghi khoản nợ mới!
                  </td>
                </tr>
              ) : (
                filteredDebts.map((debt) => {
                  const isLend = debt.type === 'lend';
                  const isExpanded = expandedHistories[debt.id];
                  const hasPayments = debt.payments && debt.payments.length > 0;

                  return (
                    <React.Fragment key={debt.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors group">
                        {/* Cột 1: Ngày vay & Hạn trả */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {formatFriendlyDate(debt.startDate)}
                          </div>
                          {debt.dueDate ? (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Hạn: {formatFriendlyDate(debt.dueDate)}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              Không đặt hạn
                            </div>
                          )}
                        </td>

                        {/* Cột 2: Đối tác & Phân loại */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0 text-[10px] font-bold ${
                                isLend ? 'bg-emerald-600' : 'bg-rose-600'
                              }`}
                            >
                              {isLend ? 'THU' : 'TRẢ'}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {debt.personName}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                {debt.phoneNumber && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    {debt.phoneNumber}
                                  </span>
                                )}
                                <span>• {isLend ? 'Người nợ tôi' : 'Tôi nợ'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Cột 3: Số tiền gốc */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-700">
                          {formatCurrency(debt.originalAmount)}
                        </td>

                        {/* Cột 4: Đã trả / Đã thu */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-semibold text-slate-600">
                            {formatCurrency(debt.paidAmount)}
                          </span>
                          {hasPayments && (
                            <button
                              type="button"
                              onClick={() => toggleHistory(debt.id)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 block ml-auto mt-0.5 font-medium flex items-center gap-0.5"
                            >
                              <span>{debt.payments.length} lần trả</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </td>

                        {/* Cột 5: Còn lại */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              isLend
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isLend ? '+' : '-'}
                            {formatCurrency(debt.remainingAmount)}
                          </span>
                        </td>

                        {/* Cột 6: Trạng thái */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {getStatusBadge(debt)}
                        </td>

                        {/* Cột 7: Lý do & Ghi chú */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 truncate">
                            {debt.description}
                          </div>
                          {debt.note && (
                            <div className="text-[10px] text-slate-400 italic truncate mt-0.5">
                              &quot;{debt.note}&quot;
                            </div>
                          )}
                        </td>

                        {/* Cột 8: Thao tác */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút Trả bớt / Thu bớt nếu còn nợ */}
                            {debt.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPayingDebt(debt);
                                  setPayRawAmount('');
                                  setPayNote('');
                                }}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-indigo-200"
                                title="Ghi nhận trả/thu bớt một phần"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>{isLend ? 'Thu bớt' : 'Trả bớt'}</span>
                              </button>
                            )}

                            {/* Nút Hoàn tất 100% */}
                            {debt.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => onMarkAsPaid(debt.id)}
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors border border-emerald-200"
                                title="Đánh dấu đã hoàn tất 100%"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Sửa */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(debt)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Sửa thông tin"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Xóa */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Xóa khoản nợ của "${debt.personName}"?`)) {
                                  onDeleteDebt(debt.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Xóa khoản nợ này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Payment History Row */}
                      {isExpanded && hasPayments && (
                        <tr className="bg-slate-50/90 text-xs">
                          <td colSpan={8} className="p-3 pl-12 border-b border-slate-200">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 max-w-2xl">
                              <div className="font-bold text-slate-700 mb-2 flex items-center gap-1.5 text-[11px]">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                Lịch Sử Các Đợt Đã Thanh Toán Cho Khoản Nợ Này:
                              </div>
                              <div className="space-y-1.5">
                                {debt.payments.map((p, idx) => (
                                  <div
                                    key={p.id || idx}
                                    className="flex items-center justify-between text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-100"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-500">
                                        Đợt {idx + 1}:
                                      </span>
                                      <span className="font-medium text-slate-700">
                                        {formatFriendlyDate(p.date)}
                                      </span>
                                      {p.note && (
                                        <span className="text-slate-400 italic">
                                          - &quot;{p.note}&quot;
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-black text-emerald-600">
                                      +{formatCurrency(p.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* BẢNG TỔNG KẾT REPORT DƯỚI BẢNG */}
        <div className="p-4 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700">
          <div>
            Đang hiển thị <strong>{filteredDebts.length}</strong> / {debts.length} khoản nợ
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-emerald-700 font-extrabold">
              Tổng Cần Thu: +{formatCurrency(totalLendRemaining)}
            </span>
            <span className="text-rose-700 font-extrabold">
              Tổng Cần Trả: -{formatCurrency(totalBorrowRemaining)}
            </span>
            <span
              className={`font-black px-2.5 py-1 rounded-lg ${
                netDebtBalance >= 0
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              Cân Đối Ròng: {netDebtBalance >= 0 ? '+' : ''}
              {formatCurrency(netDebtBalance)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL GHI NHẬN THANH TOÁN (TRẢ BỚT / THU BỚT)                          */}
      {/* ========================================================================= */}
      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                {payingDebt.type === 'lend' ? 'Thu Nợ Từ' : 'Trả Nợ Cho'} {payingDebt.personName}
              </h3>
              <button
                type="button"
                onClick={() => setPayingDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Số tiền gốc ban đầu:</span>
                  <span className="font-bold">{formatCurrency(payingDebt.originalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Đã thanh toán trước đó:</span>
                  <span className="font-bold text-slate-700">{formatCurrency(payingDebt.paidAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-200 pt-1">
                  <span>Số tiền còn nợ hiện tại:</span>
                  <span className={payingDebt.type === 'lend' ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatCurrency(payingDebt.remainingAmount)}
                  </span>
                </div>
              </div>

              {/* Số tiền thanh toán đợt này */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Số tiền {payingDebt.type === 'lend' ? 'thu' : 'trả'} đợt này *
                  </label>
                  <span className="text-[11px] text-amber-600 font-bold">
                    {rawPayNum > 0
                      ? `= ${formatCurrency(calculatedPayAmount)}`
                      : payAutoAdd000
                      ? '+ 000'
                      : ''}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    max={payingDebt.remainingAmount}
                    required
                    placeholder={payAutoAdd000 ? '100 (100.000đ)' : '100000'}
                    value={payRawAmount}
                    onChange={(e) => setPayRawAmount(e.target.value)}
                    className="w-full px-3 py-2 pr-12 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {payAutoAdd000 ? 'k đ' : 'đ'}
                  </span>
                </div>
                {/* Nút thanh toán hết toàn bộ */}
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setPayRawAmount(
                        payAutoAdd000
                          ? String(payingDebt.remainingAmount / 1000)
                          : String(payingDebt.remainingAmount)
                      );
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    ⚡ Trả hết số nợ còn lại ({formatCurrency(payingDebt.remainingAmount)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayAutoAdd000(!payAutoAdd000)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {payAutoAdd000 ? 'Tắt auto 000' : 'Bật auto 000'}
                  </button>
                </div>
              </div>

              {/* Ngày thanh toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày thanh toán
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú đợt thanh toán
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chuyển khoản Vietcombank, trả đợt 1..."
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
                >
                  Xác Nhận Thanh Toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL SỬA THÔNG TIN KHOẢN NỢ                                           */}
      {/* ========================================================================= */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden text-slate-800">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                Chỉnh Sửa Khoản Nợ
              </h3>
              <button
                type="button"
                onClick={() => setEditingDebt(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên người nợ / Chủ nợ *
                </label>
                <input
                  type="text"
                  required
                  value={editPersonName}
                  onChange={(e) => setEditPersonName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số tiền gốc ban đầu (đ) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={editOriginalAmount}
                  onChange={(e) => setEditOriginalAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày vay
                  </label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hạn trả
                  </label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Mục đích
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDebt(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm"
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
