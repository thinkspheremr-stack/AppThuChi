import React, { useState, useEffect } from 'react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { formatCurrency } from '../utils/formatters';
import { CategoryIcon } from './CategoryIcon';
import {
  X,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Calendar,
  Clock,
  Tag,
  FileText,
  Landmark,
  Wallet,
  Check,
} from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
  onSave: (transactionData: Omit<Transaction, 'id' | 'createdAt'>, editingId?: string) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  initialType = 'expense',
  editingTransaction,
  onSave,
}) => {
  const [type, setType] = useState<TransactionType>(initialType);
  const [amount, setAmount] = useState<number | ''>('');
  const [accountId, setAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Quick amount additions (in VND)
  const QUICK_AMOUNTS = [20000, 50000, 100000, 200000, 500000, 1000000, 2000000];

  // Quick description suggestions
  const QUICK_DESCRIPTIONS_EXPENSE = [
    'Ăn sáng',
    'Cà phê',
    'Ăn trưa',
    'Đổ xăng xe',
    'Đi chợ / Siêu thị',
    'Shopee / Mua sắm',
    'Ăn tối',
    'Tiền điện nước',
    'Thuê phòng / Nhà',
    'Khám bệnh / Thuốc',
  ];

  const QUICK_DESCRIPTIONS_INCOME = [
    'Tiền lương công ty',
    'Thưởng doanh số',
    'Dự án ngoài / Freelance',
    'Lãi ngân hàng',
    'Bán hàng online',
    'Được lì xì / Quà biếu',
  ];

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount);
      setAccountId(editingTransaction.accountId);
      setToAccountId(editingTransaction.toAccountId || '');
      setCategoryId(editingTransaction.categoryId || '');
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || '12:00');
      setDescription(editingTransaction.description || '');
      setNote(editingTransaction.note || '');
    } else {
      const now = new Date();
      setType(initialType);
      setAmount('');
      setAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || '');
      setDate(now.toISOString().slice(0, 10));
      setTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setDescription('');
      setNote('');

      // Default category
      const defaultCat = categories.find((c) => c.type === (initialType === 'income' ? 'income' : 'expense'));
      setCategoryId(defaultCat?.id || '');
    }
  }, [isOpen, editingTransaction, initialType, accounts, categories]);

  // Adjust category when type changes
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType !== 'transfer') {
      const defaultCat = categories.find((c) => c.type === newType);
      setCategoryId(defaultCat?.id || '');
    }
  };

  const handleAddAmount = (add: number) => {
    setAmount((prev) => (Number(prev) || 0) + add);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) return;
    if (!accountId) return;
    if (type === 'transfer' && (!toAccountId || toAccountId === accountId)) {
      alert('Vui lòng chọn tài khoản nhận khác với tài khoản chuyển!');
      return;
    }

    onSave(
      {
        type,
        amount: parsedAmount,
        date: date || new Date().toISOString().slice(0, 10),
        time: time || '12:00',
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : undefined,
        categoryId: type !== 'transfer' ? categoryId : undefined,
        description: description.trim() || (type === 'transfer' ? 'Chuyển tiền nội bộ' : type === 'expense' ? 'Khoản chi tiêu' : 'Khoản thu nhập'),
        note: note.trim(),
      },
      editingTransaction?.id
    );

    onClose();
  };

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.type === (type === 'income' ? 'income' : 'expense'));
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const selectedToAccount = accounts.find((a) => a.id === toAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-base text-slate-800">
            {editingTransaction ? 'Chỉnh Sửa Giao Dịch' : 'Thêm Giao Dịch Mới'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {/* Transaction Type Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingDown className="w-4 h-4" />
              Chi Tiền
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Thu Tiền
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('transfer')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              Chuyển Khoản
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Số tiền (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1000"
                step="1000"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full text-2xl font-bold text-slate-900 pl-4 pr-16 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                VNĐ
              </span>
            </div>
            {amount !== '' && (
              <div className="text-xs font-semibold text-slate-500 mt-1 pl-1">
                = {formatCurrency(Number(amount))}
              </div>
            )}

            {/* Quick Amount Additions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleAddAmount(amt)}
                  className="text-[11px] font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  +{amt >= 1000000 ? `${amt / 1000000}tr` : `${amt / 1000}k`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount('')}
                className="text-[11px] font-medium px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors ml-auto"
              >
                Xóa
              </button>
            </div>
          </div>

          {/* Account Selector (The bank / wallet that pays or receives) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-slate-500" />
                {type === 'expense'
                  ? 'Chi từ tài khoản / ngân hàng:'
                  : type === 'income'
                  ? 'Nhận vào tài khoản / ngân hàng:'
                  : 'Chuyển từ tài khoản:'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Số dư: {formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* If transfer, Destination account */}
            {type === 'transfer' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  Chuyển tới tài khoản / ví:
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Số dư: {formatCurrency(acc.balance)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ngày giao dịch:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Date & Time if Transfer */}
          {type === 'transfer' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ngày giao dịch</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Giờ</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Category Selector (For Expense & Income) */}
          {type !== 'transfer' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Danh mục phân loại <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                {filteredCategories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/30 shadow-xs'
                          : 'border-slate-200/70 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white mb-1 shadow-2xs"
                        style={{ backgroundColor: cat.color }}
                      >
                        <CategoryIcon name={cat.icon} className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-700 truncate w-full">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Description & Quick Suggestions */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Nội dung / Mô tả
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'transfer'
                  ? 'Ví dụ: Nạp ví MoMo, Rút tiền ATM...'
                  : type === 'expense'
                  ? 'Ví dụ: Cơm trưa, Cà phê Highlands, Đổ xăng...'
                  : 'Ví dụ: Tiền lương tháng này, Thưởng...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(type === 'income' ? QUICK_DESCRIPTIONS_INCOME : QUICK_DESCRIPTIONS_EXPENSE).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDescription(item)}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Ghi chú thêm (tùy chọn)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú chi tiết nếu có..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                type === 'expense'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : type === 'income'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {editingTransaction ? 'Cập Nhật Giao Dịch' : 'Lưu Giao Dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
