import React, { useState, useEffect } from 'react';
import { Category, Transaction } from '../types';
import { CategoryIcon } from './CategoryIcon';
import {
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  AlertCircle,
  Tag,
  Palette,
  Sparkles,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions?: Transaction[];
  initialType?: 'expense' | 'income';
  onAddCategory: (category: Omit<Category, 'id'>) => Category | void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onResetCategories?: () => void;
  onCategoryCreated?: (newCategory: Category) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Utensils', label: 'Ăn uống' },
  { name: 'Coffee', label: 'Cà phê' },
  { name: 'Car', label: 'Đi lại' },
  { name: 'Home', label: 'Nhà ở' },
  { name: 'Zap', label: 'Điện nước' },
  { name: 'ShoppingBag', label: 'Mua sắm' },
  { name: 'HeartPulse', label: 'Sức khỏe' },
  { name: 'GraduationCap', label: 'Học tập' },
  { name: 'Gift', label: 'Quà biếu' },
  { name: 'Briefcase', label: 'Lương / Việc' },
  { name: 'Trophy', label: 'Thưởng' },
  { name: 'Laptop', label: 'Freelance' },
  { name: 'TrendingUp', label: 'Đầu tư' },
  { name: 'Coins', label: 'Tiền bạc' },
  { name: 'Landmark', label: 'Ngân hàng' },
  { name: 'Wallet', label: 'Ví tiền' },
  { name: 'Banknote', label: 'Tiền mặt' },
  { name: 'CreditCard', label: 'Thẻ tín dụng' },
  { name: 'PiggyBank', label: 'Tiết kiệm' },
  { name: 'Receipt', label: 'Hóa đơn' },
  { name: 'MoreHorizontal', label: 'Khác' },
];

const AVAILABLE_COLORS = [
  '#F97316', // Cam
  '#EF4444', // Đỏ
  '#F43F5E', // Đỏ hồng
  '#EC4899', // Hồng
  '#8B5CF6', // Tím
  '#6366F1', // Xanh chàm
  '#3B82F6', // Xanh dương
  '#06B6D4', // Xanh lơ
  '#14B8A6', // Xanh mòng két
  '#10B981', // Xanh lá
  '#84CC16', // Xanh nõn
  '#EAB308', // Vàng
  '#F59E0B', // Hổ phách
  '#64748B', // Xám đá
  '#006533', // VCB Green
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  transactions = [],
  initialType = 'expense',
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  onResetCategories,
  onCategoryCreated,
}) => {
  // Tab: 'expense' | 'income'
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>(initialType);

  // Sync activeTab when modal is reopened or initialType changes
  useEffect(() => {
    if (isOpen && initialType) {
      setActiveTab(initialType);
    }
  }, [isOpen, initialType]);

  // Form thêm mới
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(initialType === 'income' ? 'Briefcase' : 'Utensils');
  const [newColor, setNewColor] = useState(initialType === 'income' ? '#10B981' : '#F97316');

  // Switch default icon & color when user changes tab
  const handleTabChange = (tab: 'expense' | 'income') => {
    setActiveTab(tab);
    setEditingId(null);
    if (tab === 'income') {
      if (newIcon === 'Utensils') setNewIcon('Briefcase');
      if (newColor === '#F97316') setNewColor('#10B981');
    } else {
      if (newIcon === 'Briefcase') setNewIcon('Utensils');
      if (newColor === '#10B981') setNewColor('#F97316');
    }
  };

  // Trạng thái đang sửa 1 danh mục
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Utensils');
  const [editColor, setEditColor] = useState('#F97316');
  const [editType, setEditType] = useState<'expense' | 'income'>('expense');

  // Trạng thái xác nhận xóa 1 danh mục & khôi phục mặc định
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Thông báo phản hồi
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  // Lọc theo loại chi hoặc thu
  const currentCategories = categories.filter((c) => c.type === activeTab);

  // Đếm số lượng giao dịch cho mỗi danh mục
  const txCountMap = new Map<string, number>();
  transactions.forEach((t) => {
    if (t.categoryId) {
      txCountMap.set(t.categoryId, (txCountMap.get(t.categoryId) || 0) + 1);
    }
  });

  const showNotification = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3500);
  };

  // Thêm danh mục mới
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      showNotification('Vui lòng nhập tên danh mục!');
      return;
    }

    // Kiểm tra trùng tên danh mục trong cùng loại
    const exists = categories.some(
      (c) => c.type === activeTab && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      showNotification(`Danh mục "${trimmed}" đã tồn tại trong danh sách!`);
      return;
    }

    const created = onAddCategory({
      name: trimmed,
      type: activeTab,
      icon: newIcon,
      color: newColor,
    });

    if (created && onCategoryCreated) {
      onCategoryCreated(created);
    }

    showNotification(`Đã thêm danh mục "${trimmed}" thành công!`);
    setNewName('');
  };

  // Bắt đầu sửa danh mục
  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'HelpCircle');
    setEditColor(cat.color || '#F97316');
    setEditType(cat.type);
  };

  // Lưu sửa danh mục
  const handleSaveEdit = (catId: string) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showNotification('Tên danh mục không được để trống!');
      return;
    }
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    // Kiểm tra trùng tên với danh mục khác trong cùng loại
    const isDuplicate = categories.some(
      (c) => c.id !== catId && c.type === editType && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      showNotification(`Danh mục "${trimmed}" đã tồn tại trong nhóm ${editType === 'income' ? 'Thu Nhập' : 'Chi Tiêu'}!`);
      return;
    }

    onEditCategory({
      ...cat,
      name: trimmed,
      type: editType,
      icon: editIcon,
      color: editColor,
    });

    setEditingId(null);
    if (editType !== activeTab) {
      setActiveTab(editType);
      showNotification(`Đã cập nhật và chuyển danh mục "${trimmed}" sang nhóm ${editType === 'income' ? 'Thu Nhập' : 'Chi Tiêu'}!`);
    } else {
      showNotification(`Đã cập nhật danh mục "${trimmed}" thành công!`);
    }
  };

  // Xóa danh mục (dùng inline modal an toàn không dùng window.confirm)
  const handleConfirmDelete = () => {
    if (!deletingCat) return;
    onDeleteCategory(deletingCat.id);
    showNotification(`Đã xóa danh mục "${deletingCat.name}"!`);
    setDeletingCat(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Quản Lý Danh Mục (Sửa, Thêm & Bớt)
              </h2>
              <p className="text-xs text-sky-200/90">
                Thêm danh mục mới, chỉnh sửa tên/màu sắc hoặc bớt danh mục không cần dùng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo feedback */}
        {feedback && (
          <div className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 text-center animate-in fade-in">
            {feedback}
          </div>
        )}

        {/* Tab switchers: Chi Tiêu vs Thu Nhập */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-4 pt-3 gap-2">
          <button
            type="button"
            onClick={() => handleTabChange('expense')}
            className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all border-b-2 cursor-pointer ${
              activeTab === 'expense'
                ? 'border-rose-500 text-rose-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Danh Mục Chi Tiêu ({categories.filter((c) => c.type === 'expense').length})
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('income')}
            className={`px-4 py-2 rounded-t-xl text-xs font-black transition-all border-b-2 cursor-pointer ${
              activeTab === 'income'
                ? 'border-emerald-500 text-emerald-600 bg-white shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Danh Mục Thu Nhập ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>

        {/* Nội dung danh sách & Form thêm */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* 1. Form Thêm Danh Mục Mới */}
          <form
            onSubmit={handleCreateCategory}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Thêm danh mục {activeTab === 'expense' ? 'CHI TIÊU' : 'THU NHẬP'} mới:
              </span>
              <span className="text-[11px] text-slate-500">
                Hiển thị ngay trong danh sách chọn
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              {/* Tên danh mục */}
              <div className="sm:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tên danh mục:
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    activeTab === 'expense'
                      ? 'Ví dụ: Trả góp xe, Bảo hiểm, Nuôi mèo...'
                      : 'Ví dụ: Lương part-time, Cổ tức, Cho thuê phòng...'
                  }
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Chọn Biểu tượng */}
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Biểu tượng:
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                    style={{ backgroundColor: newColor }}
                  >
                    <CategoryIcon name={newIcon} className="w-4 h-4" />
                  </div>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {AVAILABLE_ICONS.map((ic) => (
                      <option key={ic.name} value={ic.name}>
                        {ic.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chọn Màu sắc */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Màu sắc:
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {AVAILABLE_COLORS.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={`w-6 h-6 rounded-full shrink-0 transition-transform ${
                        newColor === c ? 'ring-2 ring-slate-800 scale-110 shadow-2xs' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Nút Thêm */}
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* Bảng màu mở rộng & Gợi ý nhanh */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-semibold text-slate-500 mr-1">Bảng màu:</span>
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                      newColor === c ? 'ring-2 ring-slate-800 scale-125' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Gợi ý thêm nhanh tên danh mục phổ biến */}
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-500 font-semibold mr-1">Gợi ý nhanh:</span>
                {(activeTab === 'expense'
                  ? ['Đi chợ', 'Mua sắm', 'Học phí', 'Khám bệnh', 'Đám cưới', 'Trả góp']
                  : ['Lương', 'Thưởng', 'Làm thêm', 'Bán hàng', 'Cho thuê']
                ).map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setNewName(sug)}
                    className="text-[10px] bg-white hover:bg-sky-50 text-slate-600 hover:text-sky-700 border border-slate-200 rounded-md px-1.5 py-0.5 font-medium transition-colors cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {/* 2. Danh Sách Danh Mục Hiện Có (Có thể Sửa và Xóa) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Danh sách danh mục hiện có ({currentCategories.length}):
              </span>
              <span className="text-[11px] text-slate-500 italic">
                Bấm biểu tượng cây bút để sửa tên/màu, bấm thùng rác để bớt/xóa
              </span>
            </div>

            {currentCategories.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl text-xs">
                Chưa có danh mục nào. Hãy thêm danh mục ở trên!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {currentCategories.map((cat) => {
                  const isEditing = editingId === cat.id;
                  const txCount = txCountMap.get(cat.id) || 0;

                  if (isEditing) {
                    return (
                      <form
                        key={cat.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveEdit(cat.id);
                        }}
                        className="p-3.5 rounded-xl bg-sky-50 border-2 border-sky-400 shadow-sm space-y-3 sm:col-span-2 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                          <span className="flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5 text-sky-600" />
                            Đang sửa danh mục: <strong>&quot;{cat.name}&quot;</strong>
                          </span>
                          <span className="text-[11px] text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md font-semibold">
                            {txCount} giao dịch đang dùng
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Tên danh mục:
                            </label>
                            <input
                              type="text"
                              required
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-400"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Loại:
                            </label>
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value as 'expense' | 'income')}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-400"
                            >
                              <option value="expense">Chi tiêu</option>
                              <option value="income">Thu nhập</option>
                            </select>
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-700 mb-1">
                              Biểu tượng:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0 shadow-2xs"
                                style={{ backgroundColor: editColor }}
                              >
                                <CategoryIcon name={editIcon} className="w-3.5 h-3.5" />
                              </div>
                              <select
                                value={editIcon}
                                onChange={(e) => setEditIcon(e.target.value)}
                                className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                              >
                                {AVAILABLE_ICONS.map((ic) => (
                                  <option key={ic.name} value={ic.name}>
                                    {ic.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="sm:col-span-3 flex items-center gap-1.5">
                            <button
                              type="submit"
                              className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Lưu</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Chọn màu sắc khi sửa */}
                        <div className="flex items-center gap-1.5 pt-1 border-t border-sky-200/80">
                          <span className="text-[10px] font-semibold text-slate-600">Đổi màu:</span>
                          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                            {AVAILABLE_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setEditColor(c)}
                                className={`w-4 h-4 rounded-full shrink-0 transition-transform cursor-pointer ${
                                  editColor === c ? 'ring-2 ring-slate-800 scale-125' : 'hover:scale-110 opacity-80'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 hover:shadow-xs transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-2xs"
                          style={{ backgroundColor: cat.color || '#F97316' }}
                        >
                          <CategoryIcon name={cat.icon || 'HelpCircle'} className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-800 truncate">
                            {cat.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {txCount} giao dịch đã ghi
                          </div>
                        </div>
                      </div>

                      {/* Hành động: Sửa & Xóa (Bớt) */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                          title="Sửa danh mục này"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCat(cat)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Xóa / bớt danh mục này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal/Banner xác nhận xóa danh mục an toàn */}
        {deletingCat && (
          <div className="p-3.5 bg-rose-50 border-t-2 border-rose-500 text-rose-950 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="text-xs">
                <span>Bạn có chắc chắn muốn xóa/bớt danh mục <strong>&ldquo;{deletingCat.name}&rdquo;</strong>?</span>
                {txCountMap.get(deletingCat.id) ? (
                  <span className="block text-[11px] text-rose-700 font-semibold mt-0.5">
                    (Có {txCountMap.get(deletingCat.id)} giao dịch đang dùng danh mục này)
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDeletingCat(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        )}

        {/* Modal/Banner xác nhận khôi phục mặc định an toàn */}
        {isConfirmingReset && (
          <div className="p-3.5 bg-amber-50 border-t-2 border-amber-500 text-amber-950 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Khôi phục danh sách danh mục về ban đầu mặc định của hệ thống?</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onResetCategories) onResetCategories();
                  showNotification('Đã khôi phục danh mục về mặc định thành công!');
                  setIsConfirmingReset(false);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                Xác nhận khôi phục
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Tổng cộng: <strong>{categories.length} danh mục</strong> ({categories.filter((c) => c.type === 'expense').length} chi, {categories.filter((c) => c.type === 'income').length} thu)
            </span>
            {onResetCategories && (
              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                title="Khôi phục danh sách danh mục về ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mặc định</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
