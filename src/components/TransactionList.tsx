import React, { useState, useMemo, useEffect } from 'react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { formatCurrency, formatFriendlyDate, compareTransactionsSameDay } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  Search,
  Filter,
  Trash2,
  Edit3,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  Landmark,
  X,
  FileSpreadsheet,
  Wallet,
  ChevronDown,
  ChevronUp,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  Pencil,
  Sliders,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currentMonth: string; // YYYY-MM
  selectedAccountId: string | null;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateTransactions?: (transactions: Transaction[]) => void;
  onEditAccount?: (account: Account) => void;
  onExportCSV: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  categories,
  currentMonth,
  selectedAccountId,
  onEditTransaction,
  onDeleteTransaction,
  onUpdateTransactions,
  onEditAccount,
  onExportCSV,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>(selectedAccountId || 'all');

  // Sửa nhanh số tiền trực tiếp (Inline edit amount)
  const [editingAmountTxId, setEditingAmountTxId] = useState<string | null>(null);
  const [inlineAmount, setInlineAmount] = useState<string>('');
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Điều chỉnh / Cân đối Số tiền còn lại (Adjust remaining balance modal)
  const [adjustBalanceModal, setAdjustBalanceModal] = useState<{
    tx: Transaction;
    currentBalance: number;
    accountName: string;
    accountId: string;
  } | null>(null);
  const [targetBalanceInput, setTargetBalanceInput] = useState<string>('');
  const [adjustMode, setAdjustMode] = useState<'adjust_tx' | 'adjust_account'>('adjust_tx');

  // Keep local account filter in sync if parent selectedAccountId changes
  useEffect(() => {
    if (selectedAccountId) {
      setAccountFilter(selectedAccountId);
    }
  }, [selectedAccountId]);

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // =========================================================================
  // 1. TÍNH SỐ TIỀN CÒN LẠI (RUNNING BALANCE) TÔN TRỌNG THỨ TỰ NGƯỜI DÙNG SẮP XẾP
  // =========================================================================
  const balanceAfterMap = useMemo(() => {
    const runningPerAccount: Record<string, number> = {};
    accounts.forEach((acc) => {
      runningPerAccount[acc.id] = acc.initialBalance || 0;
    });

    const allSortedAsc = [...transactions].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return compareTransactionsSameDay(a, b);
    });

    const map = new Map<
      string,
      {
        accountBalanceAfter: number;
        toAccountBalanceAfter?: number;
        totalBalanceAfter: number;
      }
    >();

    allSortedAsc.forEach((tx) => {
      if (tx.type === 'income') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) + tx.amount;
      } else if (tx.type === 'expense') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        runningPerAccount[tx.accountId] = (runningPerAccount[tx.accountId] || 0) - tx.amount;
        if (tx.toAccountId && tx.toAccountId !== 'saving') {
          runningPerAccount[tx.toAccountId] = (runningPerAccount[tx.toAccountId] || 0) + tx.amount;
        }
      }

      const total = Object.values(runningPerAccount).reduce((s, v) => s + v, 0);

      map.set(tx.id, {
        accountBalanceAfter: runningPerAccount[tx.accountId] ?? 0,
        toAccountBalanceAfter: tx.toAccountId ? runningPerAccount[tx.toAccountId] : undefined,
        totalBalanceAfter: total,
      });
    });

    return map;
  }, [accounts, transactions]);

  // =========================================================================
  // 2. LỌC GIAO DỊCH THEO BỘ LỌC (LOẠI, TÀI KHOẢN, DANH MỤC, TỪ KHÓA)
  // =========================================================================
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'expense' && t.type !== 'expense') return false;
        if (typeFilter === 'income' && t.type !== 'income') return false;
        if (typeFilter === 'transfer' && t.type !== 'transfer') return false;
        if (typeFilter === 'loan') {
          const isLoan =
            t.tags?.includes('loan') ||
            t.tags?.includes('lend') ||
            t.tags?.includes('repay') ||
            /mượn|cho vay|trả nợ|thu nợ|cho mượn|vay/i.test(t.description || '');
          if (!isLoan) return false;
        }
        if (typeFilter === 'loan_lend') {
          const isLend =
            (t.tags?.includes('loan') || t.tags?.includes('lend') || /cho mượn|cho vay/i.test(t.description || '')) &&
            (t.type === 'expense' || t.tags?.includes('lend'));
          if (!isLend) return false;
        }
        if (typeFilter === 'loan_repay') {
          const isRepay =
            (t.tags?.includes('loan') || t.tags?.includes('repay') || /trả|thu nợ/i.test(t.description || '')) &&
            (t.type === 'income' || t.tags?.includes('repay'));
          if (!isRepay) return false;
        }
      }

      // Account filter
      if (accountFilter !== 'all') {
        const matchAccount =
          t.accountId === accountFilter ||
          (t.type === 'transfer' && t.toAccountId === accountFilter);
        if (!matchAccount) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && t.categoryId !== categoryFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchNote = t.note?.toLowerCase().includes(q);
        const matchAmount = String(t.amount).includes(q);
        const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
        const matchCat = cat?.name.toLowerCase().includes(q);
        return matchDesc || matchNote || matchAmount || matchCat;
      }

      return true;
    });
  }, [transactions, typeFilter, accountFilter, categoryFilter, searchTerm, categoryMap]);

  // =========================================================================
  // 3. NHÓM THEO THÁNG & NGÀY (SẮP XẾP THEO THỨ TỰ ORDER / TIME)
  // =========================================================================
  const monthGroups = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};

    // Luôn đảm bảo currentMonth có mặt
    if (!groups[currentMonth]) {
      groups[currentMonth] = [];
    }

    filteredTransactions.forEach((t) => {
      const mKey = t.date.slice(0, 7); // YYYY-MM
      if (!groups[mKey]) {
        groups[mKey] = [];
      }
      groups[mKey].push(t);
    });

    // Sắp xếp các tháng giảm dần (mới nhất lên trước)
    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((mKey) => {
      const txs = groups[mKey] || [];

      // Nhóm theo ngày
      const dateGroups: Record<string, Transaction[]> = {};
      txs.forEach((t) => {
        if (!dateGroups[t.date]) dateGroups[t.date] = [];
        dateGroups[t.date].push(t);
      });

      // Sắp xếp các giao dịch trong cùng 1 ngày theo đúng thứ tự diễn ra
      Object.keys(dateGroups).forEach((d) => {
        dateGroups[d].sort((a, b) => compareTransactionsSameDay(a, b));
      });

      const totalExpense = txs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalIncome = txs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const [y, m] = mKey.split('-');
      const monthNum = parseInt(m, 10);
      const isCurrent = mKey === currentMonth;

      return {
        monthKey: mKey,
        year: y,
        monthNum,
        monthLabel: `Tháng ${monthNum}`,
        fullLabel: `Tháng ${monthNum}/${y}`,
        transactions: txs,
        dateGroups,
        dateKeys: Object.keys(dateGroups).sort((a, b) => b.localeCompare(a)),
        totalExpense,
        totalIncome,
        isCurrent,
      };
    });
  }, [filteredTransactions, currentMonth]);

  // =========================================================================
  // 4. TRẠNG THÁI MỞ / ĐÓNG ACCORDION THÁNG
  // =========================================================================
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(() => ({
    [currentMonth]: true, // Tháng hiện tại mặc định MỞ
  }));

  useEffect(() => {
    setExpandedMonths((prev) => ({
      ...prev,
      [currentMonth]: true,
    }));
  }, [currentMonth]);

  useEffect(() => {
    if (searchTerm.trim()) {
      const searchExpanded: Record<string, boolean> = {};
      monthGroups.forEach((g) => {
        if (g.transactions.length > 0) {
          searchExpanded[g.monthKey] = true;
        }
      });
      setExpandedMonths((prev) => ({ ...prev, ...searchExpanded }));
    }
  }, [searchTerm, monthGroups]);

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthKey]: !prev[monthKey],
    }));
  };

  const handleExpandAll = () => {
    const allExp: Record<string, boolean> = {};
    monthGroups.forEach((g) => (allExp[g.monthKey] = true));
    setExpandedMonths(allExp);
  };

  const handleCollapseAllPast = () => {
    setExpandedMonths({ [currentMonth]: true });
  };

  // =========================================================================
  // 5. TÍNH NĂNG THAY ĐỔI THỨ TỰ GIAO DỊCH TRONG CÙNG 1 NGÀY (LÊN / XUỐNG / ĐẢO)
  // Đồng bộ cả order và time để số dư dòng tiền (running balance) nhảy chính xác
  // =========================================================================
  const handleMoveTransaction = (txId: string, direction: 'up' | 'down') => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx || !onUpdateTransactions) return;

    const dateStr = targetTx.date;
    // Lấy tất cả giao dịch trong ngày đó theo đúng thứ tự đang hiển thị
    const dayTxs = transactions
      .filter((t) => t.date === dateStr)
      .sort((a, b) => compareTransactionsSameDay(a, b));

    const currentIndex = dayTxs.findIndex((t) => t.id === txId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= dayTxs.length) return;

    // Hoán đổi vị trí
    const reordered = [...dayTxs];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Lấy các mốc giờ ban đầu sắp xếp tăng dần (sớm -> muộn)
    const sortedTimes = dayTxs
      .map((t) => t.time || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    // Gán order mới cố định: 0, 1, 2... và gán mốc giờ tương ứng để diễn ra đúng trình tự
    const updateMap = new Map<string, { order: number; time?: string }>();
    reordered.forEach((t, idx) => {
      const assignedTime =
        sortedTimes.length === reordered.length ? sortedTimes[idx] : t.time;
      updateMap.set(t.id, {
        order: idx,
        time: assignedTime,
      });
    });

    const nextTransactions = transactions.map((t) => {
      if (updateMap.has(t.id)) {
        const info = updateMap.get(t.id)!;
        return {
          ...t,
          order: info.order,
          time: info.time || t.time,
        };
      }
      return t;
    });

    onUpdateTransactions(nextTransactions);
  };

  const handleReverseDayOrder = (dateStr: string) => {
    if (!onUpdateTransactions) return;

    const dayTxs = transactions
      .filter((t) => t.date === dateStr)
      .sort((a, b) => compareTransactionsSameDay(a, b));

    const reversed = [...dayTxs].reverse();

    // Lấy các mốc giờ ban đầu sắp xếp tăng dần
    const sortedTimes = dayTxs
      .map((t) => t.time || '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const updateMap = new Map<string, { order: number; time?: string }>();
    reversed.forEach((t, idx) => {
      const assignedTime =
        sortedTimes.length === reversed.length ? sortedTimes[idx] : t.time;
      updateMap.set(t.id, {
        order: idx,
        time: assignedTime,
      });
    });

    const nextTransactions = transactions.map((t) => {
      if (updateMap.has(t.id)) {
        const info = updateMap.get(t.id)!;
        return {
          ...t,
          order: info.order,
          time: info.time || t.time,
        };
      }
      return t;
    });

    onUpdateTransactions(nextTransactions);
  };

  // =========================================================================
  // 6. TÍNH NĂNG SỬA NHANH SỐ TIỀN VÀ TỰ ĐỘNG CẬP NHẬT SỐ TIỀN CÒN LẠI CÁC NGÀY SAU
  // =========================================================================
  const handleStartEditAmount = (tx: Transaction) => {
    setEditingAmountTxId(tx.id);
    setInlineAmount(String(tx.amount));
  };

  const handleSaveInlineAmount = (txId: string) => {
    const val = Number(inlineAmount);
    if (isNaN(val) || val <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0');
      return;
    }
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) return;

    const nextTransactions = transactions.map((t) => (t.id === txId ? { ...t, amount: val } : t));
    if (onUpdateTransactions) {
      onUpdateTransactions(nextTransactions);
    } else {
      onEditTransaction({ ...targetTx, amount: val });
    }

    setEditingAmountTxId(null);
    setFeedbackToast(
      `✓ Đã cập nhật số tiền thành ${formatCurrency(val)}. Số tiền còn lại của các ngày sau đó đã tự động tính lại chuẩn xác theo tất cả giao dịch!`
    );
    setTimeout(() => setFeedbackToast(null), 5000);
  };

  // =========================================================================
  // 7. TÍNH NĂNG CÂN ĐỐI / ĐIỀU CHỈNH SỐ TIỀN CÒN LẠI TẠI MỐC THỜI GIAN NÀY
  // =========================================================================
  const handleOpenAdjustBalance = (
    tx: Transaction,
    currentBalance: number,
    accountName: string,
    accountId: string
  ) => {
    setAdjustBalanceModal({
      tx,
      currentBalance,
      accountName,
      accountId,
    });
    setTargetBalanceInput(String(currentBalance));
    setAdjustMode('adjust_tx');
  };

  const handleSaveAdjustBalance = () => {
    if (!adjustBalanceModal) return;
    const targetVal = Number(targetBalanceInput);
    if (isNaN(targetVal)) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    const { tx, currentBalance, accountId } = adjustBalanceModal;
    const diff = targetVal - currentBalance;

    if (diff === 0) {
      setAdjustBalanceModal(null);
      return;
    }

    if (adjustMode === 'adjust_tx') {
      let newAmount = tx.amount;
      if (tx.type === 'expense') {
        newAmount = tx.amount - diff;
      } else if (tx.type === 'income') {
        newAmount = tx.amount + diff;
      } else if (tx.type === 'transfer') {
        if (tx.toAccountId === accountId) {
          newAmount = tx.amount + diff;
        } else {
          newAmount = tx.amount - diff;
        }
      }

      if (newAmount <= 0) {
        alert(
          'Độ chênh lệch này khiến số tiền giao dịch bị âm. Bạn hãy chọn mục "Cân đối số dư mốc của tài khoản" ở bên dưới nhé!'
        );
        return;
      }

      const nextTransactions = transactions.map((t) =>
        t.id === tx.id ? { ...t, amount: newAmount } : t
      );

      if (onUpdateTransactions) {
        onUpdateTransactions(nextTransactions);
      } else {
        onEditTransaction({ ...tx, amount: newAmount });
      }

      setAdjustBalanceModal(null);
      setFeedbackToast(
        `✓ Đã cập nhật số tiền giao dịch thành ${formatCurrency(newAmount)}. Số tiền còn lại tại ngày ${formatFriendlyDate(tx.date)} đạt ${formatCurrency(targetVal)}, các ngày sau đó đã tự động cập nhật!`
      );
      setTimeout(() => setFeedbackToast(null), 6000);
    } else {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc && onEditAccount) {
        const newInitial = (acc.initialBalance || 0) + diff;
        onEditAccount({
          ...acc,
          initialBalance: newInitial,
        });
        setAdjustBalanceModal(null);
        setFeedbackToast(
          `✓ Đã cân đối số dư tài khoản thành công! Số tiền còn lại tại ngày ${formatFriendlyDate(tx.date)} đã đạt chuẩn ${formatCurrency(targetVal)}, và toàn bộ các ngày sau đó đã tự động tính theo!`
        );
        setTimeout(() => setFeedbackToast(null), 6000);
      } else {
        alert('Không tìm thấy tài khoản để cân đối số dư.');
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Danh Sách Giao Dịch</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng cộng {filteredTransactions.length} giao dịch qua các tháng • Có thể bấm <strong>▲ / ▼</strong> để chỉnh thứ tự các khoản trong ngày
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExpandAll}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Mở tất cả các tháng"
          >
            Mở tất cả
          </button>

          <button
            type="button"
            onClick={handleCollapseAllPast}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Thu gọn các tháng trước"
          >
            Thu gọn tháng trước
          </button>

          <button
            type="button"
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Xuất danh sách ra file Excel / CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Thông báo cập nhật số tiền & số tiền còn lại tự động */}
      {feedbackToast && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button
            onClick={() => setFeedbackToast(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hướng dẫn sửa số tiền & tự động cập nhật số tiền còn lại các ngày sau */}
      <div className="mb-4 p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold text-blue-900">
            💡 Tự động đồng bộ số tiền & số tiền còn lại:
          </p>
          <p className="text-slate-600 leading-relaxed">
            Bạn có thể <strong>bấm trực tiếp vào Số tiền</strong> để sửa nhanh số tiền giao dịch, hoặc bấm vào <strong>Số tiền còn lại</strong> để cân đối số dư. Ngay sau khi sửa, số tiền còn lại của <strong>tất cả các ngày sau đó sẽ tự động tính lại chuẩn xác 100%</strong> theo các giao dịch bạn đăng.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/70">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo nội dung, số tiền..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Account / Bank Filter */}
        <div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả ngân hàng & ví</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả loại giao dịch</option>
            <option value="expense">Chỉ khoản chi</option>
            <option value="income">Chỉ khoản thu</option>
            <option value="transfer">Chuyển khoản nội bộ</option>
            <option value="loan">Mục Cho vay & Mượn nợ</option>
            <option value="loan_lend">• Chỉ khoản Cho mượn</option>
            <option value="loan_repay">• Chỉ khoản Trả nợ</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type === 'expense' ? 'Chi' : 'Thu'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. DANH SÁCH THEO THÁNG (ACCORDION THÁNG HIỆN TẠI & THÁNG TRƯỚC)          */}
      {/* ========================================================================= */}
      {monthGroups.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-sm font-medium">Không tìm thấy giao dịch nào</p>
          <p className="text-xs text-slate-400 mt-1">Thử đổi từ khóa hoặc bộ lọc ngân hàng</p>
        </div>
      ) : (
        <div className="space-y-4">
          {monthGroups.map((group) => {
            const isExpanded = expandedMonths[group.monthKey] ?? group.isCurrent;

            return (
              <div
                key={group.monthKey}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  group.isCurrent
                    ? 'border-amber-400/90 shadow-md ring-1 ring-amber-400/30'
                    : 'border-slate-200 shadow-2xs hover:border-slate-300'
                }`}
              >
                {/* THANH TIÊU ĐỀ THÁNG */}
                <button
                  type="button"
                  onClick={() => toggleMonth(group.monthKey)}
                  className={`w-full p-3.5 sm:p-4 flex items-center justify-between transition-colors text-left cursor-pointer ${
                    group.isCurrent
                      ? 'bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 text-white'
                      : isExpanded
                      ? 'bg-slate-100 text-slate-900 border-b border-slate-200'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  {/* Left: Tên Tháng theo dạng khối nổi bật */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3.5 py-1.5 rounded-xl text-base sm:text-lg font-black tracking-wide shadow-xs ${
                        group.isCurrent
                          ? 'bg-white text-slate-950 border-2 border-amber-300'
                          : 'bg-white text-slate-800 border border-slate-200'
                      }`}
                    >
                      {group.monthLabel}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            group.isCurrent ? 'text-amber-100' : 'text-slate-500'
                          }`}
                        >
                          {group.fullLabel}
                        </span>
                        {group.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white uppercase tracking-wider">
                            Tháng hiện tại
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-xs font-semibold mt-0.5 flex items-center gap-2 flex-wrap ${
                          group.isCurrent ? 'text-amber-50' : 'text-slate-600'
                        }`}
                      >
                        <span>{group.transactions.length} giao dịch</span>
                        {group.transactions.length > 0 && (
                          <>
                            <span className="opacity-60">•</span>
                            <span
                              className={
                                group.isCurrent
                                  ? 'text-rose-100 font-bold'
                                  : 'text-rose-600 font-bold'
                              }
                            >
                              Chi: -{formatCurrency(group.totalExpense)}
                            </span>
                            <span className="opacity-60">•</span>
                            <span
                              className={
                                group.isCurrent
                                  ? 'text-emerald-100 font-bold'
                                  : 'text-emerald-600 font-bold'
                              }
                            >
                              Thu: +{formatCurrency(group.totalIncome)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Mũi tên Dropdown lớn */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold hidden sm:inline ${
                        group.isCurrent ? 'text-amber-100' : 'text-slate-400'
                      }`}
                    >
                      {isExpanded ? 'Thu gọn' : 'Bấm để xem'}
                    </span>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-transform duration-200 shadow-2xs ${
                        group.isCurrent
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-white text-emerald-700 border border-slate-200 hover:bg-slate-50'
                      } ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <ChevronDown className="w-5 h-5 stroke-[2.5]" />
                    </div>
                  </div>
                </button>

                {/* NỘI DUNG GIAO DỊCH TRONG THÁNG */}
                {isExpanded && (
                  <div className="p-3 sm:p-4 bg-white space-y-4 animate-in fade-in duration-150">
                    {group.dateKeys.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-xs italic">
                        Chưa có giao dịch nào trong {group.fullLabel.toLowerCase()}.
                      </div>
                    ) : (
                      group.dateKeys.map((dateStr) => {
                        const dayTxs = group.dateGroups[dateStr];
                        const dayExpense = dayTxs
                          .filter((t) => t.type === 'expense')
                          .reduce((s, t) => s + t.amount, 0);
                        const dayIncome = dayTxs
                          .filter((t) => t.type === 'income')
                          .reduce((s, t) => s + t.amount, 0);

                        return (
                          <div key={dateStr} className="space-y-1.5">
                            {/* Date header */}
                            <div className="flex items-center justify-between text-xs font-semibold px-2.5 py-1.5 bg-slate-100/80 rounded-lg text-slate-700">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800">{formatFriendlyDate(dateStr)}</span>
                                {dayTxs.length > 1 && onUpdateTransactions && (
                                  <button
                                    type="button"
                                    onClick={() => handleReverseDayOrder(dateStr)}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
                                    title="Đảo ngược thứ tự các giao dịch trong ngày này"
                                  >
                                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                    <span>Đảo thứ tự ngày</span>
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px]">
                                {dayExpense > 0 && (
                                  <span className="text-rose-600 font-bold">
                                    Chi: -{formatCurrency(dayExpense)}
                                  </span>
                                )}
                                {dayIncome > 0 && (
                                  <span className="text-emerald-600 font-bold">
                                    Thu: +{formatCurrency(dayIncome)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Day Items */}
                            <div className="divide-y divide-slate-100">
                              {dayTxs.map((tx, txIndex) => {
                                const acc = accountMap.get(tx.accountId);
                                const toAcc = tx.toAccountId
                                  ? accountMap.get(tx.toAccountId)
                                  : null;
                                const cat = tx.categoryId
                                  ? categoryMap.get(tx.categoryId)
                                  : null;

                                const balanceInfo = balanceAfterMap.get(tx.id);
                                let balanceToShow = balanceInfo?.accountBalanceAfter ?? 0;
                                let balanceAccountLabel = acc?.name || 'Tài khoản';

                                if (accountFilter !== 'all') {
                                  if (accountFilter === tx.toAccountId) {
                                    balanceToShow = balanceInfo?.toAccountBalanceAfter ?? 0;
                                    balanceAccountLabel = toAcc?.name || 'Tài khoản nhận';
                                  }
                                } else {
                                  // Khi xem tất cả ngân hàng: nếu là chuyển khoản nhận tiền đến tài khoản này
                                  if (tx.type === 'transfer' && tx.toAccountId) {
                                    balanceToShow =
                                      balanceInfo?.toAccountBalanceAfter ??
                                      balanceInfo?.accountBalanceAfter ??
                                      0;
                                    balanceAccountLabel = toAcc?.name || acc?.name || 'Tài khoản nhận';
                                  }
                                }

                                const isFirstInDay = txIndex === 0;
                                const isLastInDay = txIndex === dayTxs.length - 1;

                                return (
                                  <div
                                    key={tx.id}
                                    className="group flex items-center justify-between py-3 px-2 rounded-xl hover:bg-slate-50 transition-colors"
                                  >
                                    {/* Left: Icon & Description & Bank Badge */}
                                    <div className="flex items-center gap-3 min-w-0">
                                      {/* Icon */}
                                      <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                                        style={{
                                          backgroundColor:
                                            tx.type === 'transfer'
                                              ? '#2563EB'
                                              : cat?.color ||
                                                (tx.type === 'income' ? '#10B981' : '#F97316'),
                                        }}
                                      >
                                        {tx.type === 'transfer' ? (
                                          <ArrowRightLeft className="w-5 h-5" />
                                        ) : (
                                          <CategoryIcon
                                            name={cat?.icon || 'HelpCircle'}
                                            className="w-5 h-5"
                                          />
                                        )}
                                      </div>

                                      {/* Details */}
                                      <div className="min-w-0">
                                        <div className="font-semibold text-sm text-slate-800 truncate flex items-center gap-1.5">
                                          {(tx.tags?.includes('lend') || (tx.type === 'expense' && /mượn|cho vay/i.test(tx.description || ''))) && (
                                            <span className="font-bold text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 shrink-0">
                                              Mục Cho mượn
                                            </span>
                                          )}
                                          {(tx.tags?.includes('repay') || (tx.type === 'income' && /trả|thu nợ/i.test(tx.description || ''))) && (
                                            <span className="font-bold text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 shrink-0">
                                              Mục Trả
                                            </span>
                                          )}
                                          <span>{tx.description}</span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                          {/* Bank badge */}
                                          {tx.type === 'transfer' ? (
                                            <>
                                              {accountFilter !== 'all' ? (
                                                accountFilter === tx.toAccountId ? (
                                                  <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <span>
                                                      Thu: Nhận từ {acc?.name || 'Ngân hàng khác'}
                                                    </span>
                                                  </span>
                                                ) : (
                                                  <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                                    <span>
                                                      Chi: Chuyển sang{' '}
                                                      {toAcc?.name || 'Ngân hàng khác'}
                                                    </span>
                                                  </span>
                                                )
                                              ) : (
                                                <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                                  <span>{acc?.name || 'Nguồn'}</span>
                                                  <span>→</span>
                                                  <span>{toAcc?.name || 'Đích'}</span>
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span
                                              className="inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded text-[11px]"
                                              style={{
                                                backgroundColor: `${acc?.color || '#006533'}15`,
                                                color: acc?.color || '#006533',
                                              }}
                                            >
                                              <Landmark className="w-3 h-3" />
                                              {acc?.name || 'Tài khoản'}
                                            </span>
                                          )}

                                          {cat && (
                                            <span className="text-slate-400 font-medium">
                                              • {cat.name}
                                            </span>
                                          )}

                                          {tx.time && (
                                            <span className="text-slate-400">• {tx.time}</span>
                                          )}

                                          {tx.note && (
                                            <span className="text-slate-400 italic truncate max-w-xs">
                                              • &quot;{tx.note}&quot;
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Amount & Running Balance & Actions */}
                                    <div className="flex items-center gap-3 shrink-0">
                                      {/* Cột 1: Số tiền giao dịch */}
                                      <div className="text-right min-w-[100px]">
                                        {editingAmountTxId === tx.id ? (
                                          <div
                                            className="flex items-center gap-1 justify-end py-0.5"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="number"
                                              min="1"
                                              step="any"
                                              value={inlineAmount}
                                              onChange={(e) => setInlineAmount(e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveInlineAmount(tx.id);
                                                if (e.key === 'Escape') setEditingAmountTxId(null);
                                              }}
                                              autoFocus
                                              className="w-28 px-2 py-1 text-xs font-bold rounded-lg border-2 border-emerald-500 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-inner"
                                              placeholder="Nhập số tiền..."
                                            />
                                            <button
                                              type="button"
                                              onClick={() => handleSaveInlineAmount(tx.id)}
                                              className="p-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
                                              title="Lưu số tiền mới (Enter)"
                                            >
                                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingAmountTxId(null)}
                                              className="p-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                                              title="Hủy (Esc)"
                                            >
                                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => handleStartEditAmount(tx)}
                                            className="cursor-pointer group/amt relative inline-flex flex-col items-end px-2 py-1 rounded-lg hover:bg-blue-50/80 hover:ring-1 hover:ring-blue-300 transition-all text-right"
                                            title="Bấm để sửa nhanh số tiền (toàn bộ các ngày sau đó sẽ tự động tính lại)"
                                          >
                                            {tx.type === 'transfer' && accountFilter !== 'all' ? (
                                              accountFilter === tx.toAccountId ? (
                                                <>
                                                  <div className="text-sm font-bold tracking-tight text-emerald-600 flex items-center gap-1 justify-end">
                                                    <span>+{formatCurrency(tx.amount)}</span>
                                                    <Pencil className="w-3 h-3 text-blue-500 opacity-0 group-hover/amt:opacity-100 transition-opacity shrink-0" />
                                                  </div>
                                                  <div className="text-[10px] text-emerald-600 font-semibold">
                                                    Tiền nhận vào
                                                  </div>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="text-sm font-bold tracking-tight text-rose-600 flex items-center gap-1 justify-end">
                                                    <span>-{formatCurrency(tx.amount)}</span>
                                                    <Pencil className="w-3 h-3 text-blue-500 opacity-0 group-hover/amt:opacity-100 transition-opacity shrink-0" />
                                                  </div>
                                                  <div className="text-[10px] text-rose-600 font-semibold">
                                                    Tiền chuyển đi
                                                  </div>
                                                </>
                                              )
                                            ) : (
                                              <>
                                                <div
                                                  className={`text-sm font-bold tracking-tight flex items-center gap-1 justify-end ${
                                                    tx.type === 'expense'
                                                      ? 'text-rose-600'
                                                      : tx.type === 'income'
                                                      ? 'text-emerald-600'
                                                      : 'text-blue-600'
                                                  }`}
                                                >
                                                  <span>
                                                    {tx.type === 'expense'
                                                      ? `-${formatCurrency(tx.amount)}`
                                                      : tx.type === 'income'
                                                      ? `+${formatCurrency(tx.amount)}`
                                                      : formatCurrency(tx.amount)}
                                                  </span>
                                                  <Pencil className="w-3 h-3 text-blue-500 opacity-0 group-hover/amt:opacity-100 transition-opacity shrink-0" />
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-medium capitalize">
                                                  {tx.type === 'expense'
                                                    ? 'Chi tiêu'
                                                    : tx.type === 'income'
                                                    ? 'Thu nhập'
                                                    : 'Chuyển khoản'}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        )}

                                        {/* Số tiền còn lại trên mobile */}
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleOpenAdjustBalance(
                                              tx,
                                              balanceToShow,
                                              balanceAccountLabel,
                                              accountFilter !== 'all' ? accountFilter : tx.accountId
                                            )
                                          }
                                          className="text-[10px] font-bold text-slate-600 sm:hidden mt-0.5 flex items-center gap-1 text-left cursor-pointer hover:underline"
                                          title="Bấm để cân đối số tiền còn lại tại mốc này"
                                        >
                                          <span>Còn lại:</span>
                                          <span
                                            className={`font-black ${
                                              balanceToShow < 0 ? 'text-rose-600' : 'text-slate-900'
                                            }`}
                                          >
                                            {formatCurrency(balanceToShow)}
                                          </span>
                                          <Sliders className="w-2.5 h-2.5 text-blue-500" />
                                        </button>
                                      </div>

                                      {/* Cột 2: Số tiền còn lại sau giao dịch */}
                                      <div
                                        onClick={() =>
                                          handleOpenAdjustBalance(
                                            tx,
                                            balanceToShow,
                                            balanceAccountLabel,
                                            accountFilter !== 'all' ? accountFilter : tx.accountId
                                          )
                                        }
                                        className={`text-right px-3 py-1.5 rounded-xl border shrink-0 min-w-[130px] hidden sm:block cursor-pointer transition-all hover:shadow-md group/balance ${
                                          balanceToShow < 0
                                            ? 'bg-rose-50 border-rose-200 hover:border-rose-400'
                                            : 'bg-slate-50 border-slate-200/90 hover:bg-blue-50/60 hover:border-blue-300'
                                        }`}
                                        title="Bấm để cân đối / điều chỉnh số tiền còn lại tại mốc này (toàn bộ các ngày sau đó sẽ tự động tính theo)"
                                      >
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-end gap-1">
                                          <Wallet
                                            className={`w-3 h-3 ${balanceToShow < 0 ? 'text-rose-500' : 'text-slate-400'}`}
                                          />
                                          <span className={balanceToShow < 0 ? 'text-rose-600 font-extrabold' : ''}>
                                            {balanceToShow < 0 ? 'Số dư bị âm' : 'Số tiền còn lại'}
                                          </span>
                                          <Sliders className="w-2.5 h-2.5 text-blue-500 opacity-0 group-hover/balance:opacity-100 transition-opacity" />
                                        </div>
                                        <div
                                          className={`text-sm font-black tracking-tight ${
                                            balanceToShow < 0 ? 'text-rose-600' : 'text-slate-900'
                                          }`}
                                        >
                                          {formatCurrency(balanceToShow)}
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-500 truncate max-w-[125px]">
                                          {balanceAccountLabel}
                                        </div>
                                      </div>

                                      {/* Cột 3: Nút Di chuyển Thứ tự Lên / Xuống & Thao tác Sửa / Xóa */}
                                      <div className="flex items-center gap-1.5">
                                        {/* Nút Di chuyển Lên / Xuống trong ngày */}
                                        {dayTxs.length > 1 && onUpdateTransactions && (
                                          <div className="flex items-center bg-slate-100/90 rounded-lg p-0.5 border border-slate-200">
                                            <button
                                              type="button"
                                              disabled={isFirstInDay}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveTransaction(tx.id, 'up');
                                              }}
                                              className={`p-1 rounded transition-all ${
                                                isFirstInDay
                                                  ? 'text-slate-300 cursor-not-allowed'
                                                  : 'text-slate-600 hover:text-slate-950 hover:bg-white cursor-pointer shadow-2xs active:scale-95'
                                              }`}
                                              title={
                                                isFirstInDay
                                                  ? 'Đã ở vị trí đầu tiên trong ngày'
                                                  : 'Di chuyển lên trên (thực hiện trước)'
                                              }
                                            >
                                              <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>

                                            <button
                                              type="button"
                                              disabled={isLastInDay}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleMoveTransaction(tx.id, 'down');
                                              }}
                                              className={`p-1 rounded transition-all ${
                                                isLastInDay
                                                  ? 'text-slate-300 cursor-not-allowed'
                                                  : 'text-slate-600 hover:text-slate-950 hover:bg-white cursor-pointer shadow-2xs active:scale-95'
                                              }`}
                                              title={
                                                isLastInDay
                                                  ? 'Đã ở vị trí cuối cùng trong ngày'
                                                  : 'Di chuyển xuống dưới (thực hiện sau)'
                                              }
                                            >
                                              <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                                            </button>
                                          </div>
                                        )}

                                        {/* Nút Sửa / Xóa */}
                                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => onEditTransaction(tx)}
                                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                                            title="Sửa giao dịch"
                                          >
                                            <Edit3 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onDeleteTransaction(tx.id);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                            title="Xóa giao dịch"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Cân đối / Điều chỉnh Số tiền còn lại */}
      {adjustBalanceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-sm sm:text-base">
                  Cân Đối Số Tiền Còn Lại (Số Dư)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setAdjustBalanceModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Giao dịch:</span>
                  <span className="font-bold text-slate-800">{adjustBalanceModal.tx.description}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ngày:</span>
                  <span className="font-semibold text-slate-700">{formatFriendlyDate(adjustBalanceModal.tx.date)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tài khoản:</span>
                  <span className="font-semibold text-slate-700">{adjustBalanceModal.accountName}</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <span>Số tiền còn lại hiện tại:</span>
                  <span className={`font-black text-sm ${adjustBalanceModal.currentBalance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {formatCurrency(adjustBalanceModal.currentBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nhập số tiền còn lại bạn muốn tại mốc này:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={targetBalanceInput}
                    onChange={(e) => setTargetBalanceInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold rounded-xl border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    placeholder="Ví dụ: 3452013"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                    ₫
                  </span>
                </div>
                {targetBalanceInput && !isNaN(Number(targetBalanceInput)) && (
                  <p className="text-[11px] text-blue-600 font-semibold mt-1">
                    Hiển thị: {formatCurrency(Number(targetBalanceInput))}
                  </p>
                )}
              </div>

              {/* Lựa chọn cách áp dụng */}
              <div className="space-y-2 pt-1">
                <span className="font-bold text-slate-700">Chọn cách hệ thống tự động cập nhật:</span>

                <label
                  onClick={() => setAdjustMode('adjust_tx')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    adjustMode === 'adjust_tx'
                      ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustMode"
                    checked={adjustMode === 'adjust_tx'}
                    onChange={() => setAdjustMode('adjust_tx')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-slate-800">
                      Cách 1: Tự động điều chỉnh số tiền của giao dịch này
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Hệ thống tự tính số tiền giao dịch này cần sửa thành bao nhiêu để số dư đạt đúng con số bạn mong muốn. Toàn bộ các ngày sau đó sẽ tự động tính theo.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setAdjustMode('adjust_account')}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    adjustMode === 'adjust_account'
                      ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjustMode"
                    checked={adjustMode === 'adjust_account'}
                    onChange={() => setAdjustMode('adjust_account')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div>
                    <div className="font-bold text-slate-800">
                      Cách 2: Cân đối số dư tài khoản bắt đầu từ mốc này
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Giữ nguyên số tiền giao dịch, tự động điều chỉnh số dư tài khoản để số dư tại mốc này chuẩn 100%, và tất cả các ngày sau đó tiếp tục tự động cộng trừ theo các giao dịch bạn đăng.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setAdjustBalanceModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustBalance}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu & Tự Động Cập Nhật
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
