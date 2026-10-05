import React, { useState, useMemo } from 'react';
import { Account, SavingBook, Transaction } from '../types';
import { formatCurrency, formatFriendlyDate } from '../utils/formatters';
import {
  PiggyBank,
  Plus,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Percent,
  Clock,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  Target,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

interface SavingsManagerProps {
  accounts: Account[];
  transactions: Transaction[];
  currentMonth: string;
  onAddTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction?: (id: string) => void;
}

// Default initial savings books if none in localStorage
const DEFAULT_SAVING_BOOKS: SavingBook[] = [
  {
    id: 'sb-emergency',
    name: 'Quỹ Dự Phòng Khẩn Cấp (6 tháng)',
    targetAmount: 60000000,
    currentBalance: 25000000,
    interestRate: 5.2,
    termMonths: 6,
    startDate: '2026-01-10',
    dueDate: '2026-07-10',
    color: '#0284c7',
    icon: 'ShieldCheck',
    note: 'Dành cho trường hợp đột xuất, ốm đau hoặc biến cố sinh hoạt',
    createdAt: Date.now() - 50000000,
  },
  {
    id: 'sb-goal-house',
    name: 'Tích Lũy Mua Nhà / Căn Hộ',
    targetAmount: 500000000,
    currentBalance: 120000000,
    interestRate: 6.0,
    termMonths: 12,
    startDate: '2026-03-01',
    dueDate: '2027-03-01',
    color: '#059669',
    icon: 'Landmark',
    note: 'Gửi tích lũy đều đặn mỗi tháng trích 15% lương',
    createdAt: Date.now() - 20000000,
  },
  {
    id: 'sb-timo-piggy',
    name: 'Heo Đất Tiết Kiệm Linh Hoạt',
    targetAmount: 20000000,
    currentBalance: 5500000,
    interestRate: 3.5,
    termMonths: 0,
    startDate: '2026-05-15',
    color: '#d97706',
    icon: 'PiggyBank',
    note: 'Tiết kiệm không kỳ hạn, rút bất cứ khi nào cần',
    createdAt: Date.now() - 10000000,
  },
];

export const SavingsManager: React.FC<SavingsManagerProps> = ({
  accounts,
  transactions,
  currentMonth,
  onAddTransaction,
}) => {
  // Load saving books from localStorage
  const [savingBooks, setSavingBooks] = useState<SavingBook[]>(() => {
    const saved = localStorage.getItem('so_thuchi_saving_books');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saving books', e);
      }
    }
    return DEFAULT_SAVING_BOOKS;
  });

  const saveSavingBooks = (updated: SavingBook[]) => {
    setSavingBooks(updated);
    localStorage.setItem('so_thuchi_saving_books', JSON.stringify(updated));
  };

  // Modals state
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<SavingBook | null>(null);

  // Form state for Book
  const [bookName, setBookName] = useState('');
  const [bookTarget, setBookTarget] = useState<number | ''>('');
  const [bookBalance, setBookBalance] = useState<number | ''>('');
  const [bookBankId, setBookBankId] = useState(accounts[0]?.id || '');
  const [bookInterest, setBookInterest] = useState<number | ''>('');
  const [bookTerm, setBookTerm] = useState<number>(6);
  const [bookStartDate, setBookStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [bookDueDate, setBookDueDate] = useState('');
  const [bookNote, setBookNote] = useState('');

  // Quick Action Modal (Nạp tiền / Rút tiền)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [targetBookId, setTargetBookId] = useState<string>('');
  const [actionAmount, setActionAmount] = useState<number | ''>('');
  const [actionBankId, setActionBankId] = useState<string>(accounts[0]?.id || '');
  const [actionNote, setActionNote] = useState<string>('');

  // Transactions that represent savings
  const savingsTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'transfer' &&
        (t.toAccountId === 'saving' || t.tags?.includes('saving'))
    );
  }, [transactions]);

  // Total savings from transactions of this month
  const thisMonthSavingsTotal = useMemo(() => {
    return savingsTransactions
      .filter((t) => t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [savingsTransactions, currentMonth]);

  // Total balance in books
  const totalBooksBalance = useMemo(() => {
    return savingBooks.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  }, [savingBooks]);

  // Total target
  const totalTargetAmount = useMemo(() => {
    return savingBooks.reduce((sum, b) => sum + (b.targetAmount || 0), 0);
  }, [savingBooks]);

  const overallProgress = totalTargetAmount > 0
    ? Math.min(100, Math.round((totalBooksBalance / totalTargetAmount) * 100))
    : 0;

  // Handlers for Saving Books
  const handleOpenAddBook = () => {
    setEditingBook(null);
    setBookName('');
    setBookTarget('');
    setBookBalance('');
    setBookBankId(accounts[0]?.id || '');
    setBookInterest(5.0);
    setBookTerm(6);
    setBookStartDate(new Date().toISOString().slice(0, 10));
    setBookDueDate('');
    setBookNote('');
    setIsAddBookModalOpen(true);
  };

  const handleOpenEditBook = (book: SavingBook) => {
    setEditingBook(book);
    setBookName(book.name);
    setBookTarget(book.targetAmount || '');
    setBookBalance(book.currentBalance);
    setBookBankId(book.bankAccountId || accounts[0]?.id || '');
    setBookInterest(book.interestRate || '');
    setBookTerm(book.termMonths || 0);
    setBookStartDate(book.startDate);
    setBookDueDate(book.dueDate || '');
    setBookNote(book.note || '');
    setIsAddBookModalOpen(true);
  };

  const handleDeleteBook = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sổ tiết kiệm này?')) {
      const updated = savingBooks.filter((b) => b.id !== id);
      saveSavingBooks(updated);
    }
  };

  const handleSaveBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName.trim()) return;

    if (editingBook) {
      const updated = savingBooks.map((b) =>
        b.id === editingBook.id
          ? {
              ...b,
              name: bookName.trim(),
              targetAmount: Number(bookTarget) || undefined,
              currentBalance: Number(bookBalance) || 0,
              bankAccountId: bookBankId,
              interestRate: Number(bookInterest) || 0,
              termMonths: bookTerm,
              startDate: bookStartDate,
              dueDate: bookDueDate || undefined,
              note: bookNote.trim(),
            }
          : b
      );
      saveSavingBooks(updated);
    } else {
      const newBook: SavingBook = {
        id: `sb-${Date.now()}`,
        name: bookName.trim(),
        targetAmount: Number(bookTarget) || undefined,
        currentBalance: Number(bookBalance) || 0,
        bankAccountId: bookBankId,
        interestRate: Number(bookInterest) || 0,
        termMonths: bookTerm,
        startDate: bookStartDate,
        dueDate: bookDueDate || undefined,
        color: '#059669',
        icon: 'PiggyBank',
        note: bookNote.trim(),
        createdAt: Date.now(),
      };
      saveSavingBooks([...savingBooks, newBook]);
    }

    setIsAddBookModalOpen(false);
  };

  // Nạp thêm hoặc Rút tiền từ Sổ
  const handleOpenDepositModal = (type: 'deposit' | 'withdraw', bookId?: string) => {
    setActionType(type);
    setTargetBookId(bookId || savingBooks[0]?.id || '');
    setActionAmount('');
    setActionBankId(accounts[0]?.id || '');
    setActionNote(type === 'deposit' ? 'Gửi tích lũy thêm' : 'Rút tiền tiết kiệm');
    setIsDepositModalOpen(true);
  };

  const handleSaveDepositAction = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(actionAmount);
    if (!amountNum || amountNum <= 0 || !targetBookId) return;

    const book = savingBooks.find((b) => b.id === targetBookId);
    if (!book) return;

    const bankAcc = accounts.find((a) => a.id === actionBankId);
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5);

    if (actionType === 'deposit') {
      // 1. Tăng số dư sổ
      const updatedBooks = savingBooks.map((b) =>
        b.id === targetBookId
          ? { ...b, currentBalance: b.currentBalance + amountNum }
          : b
      );
      saveSavingBooks(updatedBooks);

      // 2. Tạo giao dịch chuyển từ ngân hàng vào tiết kiệm
      onAddTransaction({
        type: 'transfer',
        amount: amountNum,
        date: today,
        time: nowTime,
        accountId: actionBankId,
        toAccountId: 'saving',
        description: `Gửi tiết kiệm: ${book.name}`,
        note: actionNote.trim() || `Trích từ ${bankAcc?.name || 'ngân hàng'} vào sổ tiết kiệm`,
        tags: ['saving', book.name],
      });
    } else {
      // Rút tiền: Giảm số dư sổ
      const newBal = Math.max(0, book.currentBalance - amountNum);
      const updatedBooks = savingBooks.map((b) =>
        b.id === targetBookId ? { ...b, currentBalance: newBal } : b
      );
      saveSavingBooks(updatedBooks);

      // Tạo giao dịch thu nhập hoàn về ngân hàng
      onAddTransaction({
        type: 'income',
        amount: amountNum,
        date: today,
        time: nowTime,
        accountId: actionBankId,
        description: `Rút tiết kiệm: ${book.name}`,
        note: actionNote.trim() || `Tất toán / rút một phần từ ${book.name} về ${bankAcc?.name || 'tài khoản'}`,
        tags: ['saving_withdraw'],
      });
    }

    setIsDepositModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. HEADER BANNER SỔ TIẾT KIỆM                                            */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-[#0d3429] via-[#0b271f] to-[#081b16] rounded-2xl p-5 sm:p-6 text-white shadow-md border-2 border-emerald-500/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 border border-emerald-300 shrink-0">
              <PiggyBank className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase">
                  SỔ TIẾT KIỆM & TÍCH LŨY MỤC TIÊU
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-400 text-emerald-950">
                  {savingBooks.length} Sổ & Quỹ
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1">
                Theo dõi tập trung các khoản tiền gửi ngân hàng, quỹ khẩn cấp, tiến độ mục tiêu tài chính & tích lũy lãi suất
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenDepositModal('deposit')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Gửi Thêm Tiền</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDepositModal('withdraw')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Rút Tiền Về</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAddBook}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              <span>Mở Sổ Mới</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Mini Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-emerald-500/20">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <div className="text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1">
              <PiggyBank className="w-3.5 h-3.5" />
              Tổng Tiền Đang Tiết Kiệm
            </div>
            <div className="text-lg font-black text-white">
              {formatCurrency(totalBooksBalance)}
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">
              Tại các sổ & quỹ tích lũy
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <div className="text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Đã Tiết Kiệm Tháng Này
            </div>
            <div className="text-lg font-black text-emerald-300">
              +{formatCurrency(thisMonthSavingsTotal)}
            </div>
            <div className="text-[10px] text-emerald-200/80 mt-0.5">
              Từ các giao dịch trích quỹ
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <div className="text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              Tiến Độ Mục Tiêu
            </div>
            <div className="text-lg font-black text-amber-300">
              {overallProgress}%
            </div>
            <div className="text-[10px] text-emerald-200/80 mt-0.5">
              {formatCurrency(totalBooksBalance)} / {formatCurrency(totalTargetAmount)}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded-xl border border-white/10">
            <div className="text-[11px] font-bold text-emerald-200 mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Sức Mạnh Tài Chính
            </div>
            <div className="text-lg font-black text-white">
              An Toàn
            </div>
            <div className="text-[10px] text-emerald-300 mt-0.5">
              Quỹ khẩn cấp hoạt động tốt
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DANH SÁCH CÁC SỔ & MỤC TIÊU TIẾT KIỆM (CARD GRID)                      */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Danh Sách Các Sổ & Quỹ Tiết Kiệm
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              ({savingBooks.length} mục)
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddBook}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm sổ tiết kiệm</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savingBooks.map((book) => {
            const linkedBank = accounts.find((a) => a.id === book.bankAccountId);
            const progress = book.targetAmount && book.targetAmount > 0
              ? Math.min(100, Math.round((book.currentBalance / book.targetAmount) * 100))
              : null;

            return (
              <div
                key={book.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-xs shrink-0"
                        style={{ backgroundColor: book.color || '#059669' }}
                      >
                        <PiggyBank className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                          {book.name}
                        </h3>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          {linkedBank ? (
                            <span className="flex items-center gap-1 text-slate-700 font-bold">
                              <Landmark className="w-3 h-3 text-slate-400" />
                              {linkedBank.name}
                            </span>
                          ) : (
                            <span>Tiết kiệm chung</span>
                          )}
                          {book.termMonths !== undefined && (
                            <span className="text-slate-400 font-semibold">
                              • {book.termMonths === 0 ? 'Không kỳ hạn' : `${book.termMonths} tháng`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBook(book)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBook(book.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Xóa sổ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-3">
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">
                      Số tiền hiện có
                    </div>
                    <div className="text-xl font-black text-slate-900">
                      {formatCurrency(book.currentBalance)}
                    </div>
                    {book.targetAmount && (
                      <div className="text-[11px] text-slate-500 font-semibold mt-1 flex items-center justify-between">
                        <span>Mục tiêu: {formatCurrency(book.targetAmount)}</span>
                        <span className="font-extrabold text-emerald-700">{progress}%</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {progress !== null && (
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3.5">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  {/* Info Tags */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mb-3">
                    {book.interestRate !== undefined && book.interestRate > 0 && (
                      <div className="flex items-center gap-1 font-semibold text-emerald-700">
                        <Percent className="w-3 h-3 text-emerald-600" />
                        <span>Lãi suất: {book.interestRate}%/năm</span>
                      </div>
                    )}
                    {book.dueDate && (
                      <div className="flex items-center gap-1 font-medium text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Đáo hạn: {formatFriendlyDate(book.dueDate)}</span>
                      </div>
                    )}
                  </div>

                  {book.note && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2 mb-3">
                      "{book.note}"
                    </p>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenDepositModal('deposit', book.id)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Nạp Thêm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDepositModal('withdraw', book.id)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs text-center transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>Rút Tiền</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LỊCH SỬ DÒNG TIỀN TIẾT KIỆM (TỪ CÁC GIAO DỊCH TRÍCH QUỸ)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wide">
              Lịch Sử Các Khoản Tiền Đã Trích Gửi Tiết Kiệm
            </h2>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              {savingsTransactions.length} giao dịch
            </span>
          </div>
        </div>

        {savingsTransactions.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-2.5 px-3.5">Ngày</th>
                  <th className="py-2.5 px-3.5">Ngân hàng trích tiền</th>
                  <th className="py-2.5 px-3.5">Mục đích tiết kiệm</th>
                  <th className="py-2.5 px-3.5">Ghi chú</th>
                  <th className="py-2.5 px-3.5 text-right text-emerald-700">Số tiền trích</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {savingsTransactions.slice(0, 15).map((tx) => {
                  const acc = accounts.find((a) => a.id === tx.accountId);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-semibold text-slate-700">{tx.date}</td>
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{acc?.name || 'Ngân hàng'}</td>
                      <td className="py-2.5 px-3.5 font-bold text-emerald-800">{tx.description}</td>
                      <td className="py-2.5 px-3.5 text-slate-500 italic">{tx.note || '-'}</td>
                      <td className="py-2.5 px-3.5 text-right font-black text-emerald-600 text-sm">
                        +{formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
            Chưa có giao dịch trích tiền vào tiết kiệm nào. Khi bạn thực hiện chuyển tiền vào "Mục Tiết Kiệm" từ Sổ Thu Chi, các giao dịch sẽ tự động xuất hiện tại đây.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL THÊM / SỬA SỔ TIẾT KIỆM                                          */}
      {/* ========================================================================= */}
      {isAddBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-base text-slate-800">
                {editingBook ? 'Chỉnh Sửa Sổ Tiết Kiệm' : 'Mở Sổ Tiết Kiệm / Mục Tiêu Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Sổ / Mục Tiêu Tiết Kiệm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Quỹ khẩn cấp, Mua xe máy, Tiết kiệm 6 tháng VCB"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Tiền Hiện Có (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={bookBalance}
                    onChange={(e) => setBookBalance(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Tiền Mục Tiêu (Nếu có)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ví dụ: 50000000"
                    value={bookTarget}
                    onChange={(e) => setBookTarget(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngân Hàng Liên Kết
                  </label>
                  <select
                    value={bookBankId}
                    onChange={(e) => setBookBankId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kỳ Hạn Gửi
                  </label>
                  <select
                    value={bookTerm}
                    onChange={(e) => setBookTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>Không kỳ hạn (Linh hoạt)</option>
                    <option value={1}>1 Tháng</option>
                    <option value={3}>3 Tháng</option>
                    <option value={6}>6 Tháng</option>
                    <option value={12}>12 Tháng (1 năm)</option>
                    <option value={24}>24 Tháng (2 năm)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lãi Suất (%/năm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="Ví dụ: 5.5"
                    value={bookInterest}
                    onChange={(e) => setBookInterest(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày Gửi / Ngày Mở
                  </label>
                  <input
                    type="date"
                    value={bookStartDate}
                    onChange={(e) => setBookStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú Mục Đích
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về quy tắc tích lũy, thời điểm rút tiền..."
                  value={bookNote}
                  onChange={(e) => setBookNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
                >
                  {editingBook ? 'Lưu Thay Đổi' : 'Tạo Sổ Tiết Kiệm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL NẠP TIỀN / RÚT TIỀN TIẾT KIỆM                                     */}
      {/* ========================================================================= */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-base text-slate-800">
                {actionType === 'deposit' ? 'Gửi Thêm Tiền Vào Tiết Kiệm' : 'Rút Tiền Tiết Kiệm Về Ngân Hàng'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepositAction} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Sổ / Quỹ Tiết Kiệm <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetBookId}
                  onChange={(e) => setTargetBookId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {savingBooks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Hiện có: {formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Tiền (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ví dụ: 1000000"
                  value={actionAmount}
                  onChange={(e) => setActionAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {actionAmount !== '' && (
                  <div className="text-xs font-bold text-emerald-700 mt-1">
                    = {formatCurrency(Number(actionAmount))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {actionType === 'deposit' ? 'Trích Từ Ngân Hàng' : 'Rút Về Ngân Hàng'}
                </label>
                <select
                  value={actionBankId}
                  onChange={(e) => setActionBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} (Số dư: {formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi Chú
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú giao dịch..."
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-black text-xs shadow-md ${
                    actionType === 'deposit'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-blue-600 hover:bg-blue-500'
                  }`}
                >
                  {actionType === 'deposit' ? 'Xác Nhận Gửi' : 'Xác Nhận Rút'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
