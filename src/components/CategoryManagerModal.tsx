import React, { useState } from 'react';
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
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onResetCategories?: () => void;
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
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  // Tab: 'expense' | 'income'
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

  // Form thêm mới
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('Utensils');
  const [newColor, setNewColor] = useState('#F97316');

  // Trạng thái đang sửa 1 danh mục
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Utensils');
  const [editColor, setEditColor] = useState('#F97316');

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
    setTimeout(() => setFeedback(null), 3000);
  };

  // Thêm danh mục mới
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddCategory({
      name: newName.trim(),
      type: activeTab,
      icon: newIcon,
      color: newColor,
    });

    showNotification(`Đã thêm danh mục "${newName.trim()}" thành công!`);
    setNewName('');
  };

  // Bắt đầu sửa danh mục
  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditIcon(cat.icon || 'HelpCircle');
    setEditColor(cat.color || '#F97316');
  };

  // Lưu sửa danh mục
  const handleSaveEdit = (catId: string) => {
    if (!editName.trim()) return;
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;

    onEditCategory({
      ...cat,
      name: editName.trim(),
      icon: editIcon,
      color: editColor,
    });

    setEditingId(null);
    showNotification(`Đã cập nhật danh mục "${editName.trim()}"!`);
  };

  // Xóa danh mục
  const handleDelete = (cat: Category) => {
    const count = txCountMap.get(cat.id) || 0;
    if (count > 0) {
      const confirmDelete = window.confirm(
        `Danh mục "${cat.name}" đang có ${count} giao dịch. Nếu xóa, các giao dịch này sẽ chuyển về không phân loại. Bạn có chắc muốn xóa không?`
      );
      if (!confirmDelete) return;
    } else {
      const confirmDelete = window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`);
      if (!confirmDelete) return;
    }

    onDeleteCategory(cat.id);
    showNotification(`Đã xóa danh mục "${cat.name}"!`);
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
            onClick={() => {
              setActiveTab('expense');
              setEditingId(null);
            }}
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
            onClick={() => {
              setActiveTab('income');
              setEditingId(null);
            }}
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

            {/* Bảng màu mở rộng */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
              <span className="text-[10px] font-semibold text-slate-500 mr-1">Bảng màu khác:</span>
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
                      <div
                        key={cat.id}
                        className="p-3 rounded-xl bg-sky-50 border-2 border-sky-400 shadow-xs space-y-2.5 sm:col-span-2 animate-in fade-in"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-sky-950">
                          <span>Đang sửa danh mục: &quot;{cat.name}&quot;</span>
                          <span className="text-[11px] text-sky-700">({txCount} giao dịch đang dùng)</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              Tên danh mục:
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                            />
                          </div>

                          <div className="sm:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              Biểu tượng:
                            </label>
                            <select
                              value={editIcon}
                              onChange={(e) => setEditIcon(e.target.value)}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                            >
                              {AVAILABLE_ICONS.map((ic) => (
                                <option key={ic.name} value={ic.name}>
                                  {ic.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              Màu sắc:
                            </label>
                            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                              {AVAILABLE_COLORS.slice(0, 5).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setEditColor(c)}
                                  className={`w-5 h-5 rounded-full shrink-0 ${
                                    editColor === c ? 'ring-2 ring-slate-800 scale-110' : 'opacity-80'
                                  }`}
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="sm:col-span-2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat.id)}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Lưu</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
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
                          onClick={() => handleDelete(cat)}
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

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              Tổng cộng: <strong>{categories.length} danh mục</strong> ({categories.filter((c) => c.type === 'expense').length} chi, {categories.filter((c) => c.type === 'income').length} thu)
            </span>
            {onResetCategories && (
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    'Bạn có chắc muốn khôi phục danh mục về danh sách mặc định ban đầu?'
                  );
                  if (confirmed) {
                    onResetCategories();
                    showNotification('Đã khôi phục danh mục về mặc định thành công!');
                  }
                }}
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
