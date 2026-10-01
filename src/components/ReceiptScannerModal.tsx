import React, { useState, useRef, useEffect } from 'react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { scanReceiptImage, ExtractedTransactionItem } from '../services/receiptScannerService';
import { formatCurrency } from '../utils/formatters';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileImage,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Trash2,
  Plus,
  CheckSquare,
  Square,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  activeAccountId: string;
  currentMonth: string;
  onSaveTransactions: (transactions: Array<Omit<Transaction, 'id' | 'createdAt'>>) => void;
}

interface EditableTransactionRow extends ExtractedTransactionItem {
  id: string;
  selected: boolean;
  accountId: string;
  categoryId: string;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  activeAccountId,
  currentMonth,
  onSaveTransactions,
}) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // List of all extracted transactions from the image
  const [items, setItems] = useState<EditableTransactionRow[]>([]);
  const [overallSummary, setOverallSummary] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSaveSuccess(false);
      setScanError(null);
    }
  }, [isOpen]);

  // Support paste from clipboard (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          if (file) {
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, accounts, categories]);

  if (!isOpen) return null;

  // Process file upload
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanError('Vui lòng chọn file hình ảnh (PNG, JPG, JPEG, WEBP)');
      return;
    }

    setCurrentFile(file);
    setScanError(null);
    setSaveSuccess(false);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreview(base64);

      await runScan(base64, file.type);
    };
    reader.onerror = () => {
      setScanError('Không thể đọc file ảnh');
      setIsScanning(false);
    };
    reader.readAsDataURL(file);
  };

  // Run the scan logic
  const runScan = async (base64: string, mimeType: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const result = await scanReceiptImage(base64, mimeType);
      setOverallSummary(result.overallSummary || `Phát hiện ${result.transactions.length} giao dịch trong ảnh`);

      if (!result.transactions || result.transactions.length === 0) {
        throw new Error('Không phát hiện thấy giao dịch nào trong ảnh. Bạn có thể bấm "+ Thêm giao dịch" để nhập nhanh.');
      }

      // Map each transaction to editable row with matched bank & category
      const mappedRows: EditableTransactionRow[] = result.transactions.map((tx, idx) => {
        // 1. Match Bank Account
        let chosenAccountId = activeAccountId || accounts[0]?.id || '';
        if (tx.bankName) {
          const lower = tx.bankName.toLowerCase();
          const matchedAcc = accounts.find((a) => {
            const name = (a.name + ' ' + (a.bankName || '')).toLowerCase();
            return (
              (lower.includes('vcb') || lower.includes('vietcombank')) && (name.includes('vietcombank') || name.includes('vcb')) ||
              (lower.includes('techcombank') || lower.includes('tcb')) && name.includes('techcombank') ||
              (lower.includes('mb') || lower.includes('military')) && name.includes('mb') ||
              (lower.includes('timo') && name.includes('timo')) ||
              (lower.includes('momo') && name.includes('momo')) ||
              name.includes(lower) || lower.includes(name)
            );
          });
          if (matchedAcc) chosenAccountId = matchedAcc.id;
        }

        // 2. Match Category
        const typeCategories = categories.filter((c) => c.type === tx.type);
        let chosenCategoryId = typeCategories[0]?.id || '';
        if (tx.categorySuggestion) {
          const lowerCat = tx.categorySuggestion.toLowerCase();
          const matchedCat = typeCategories.find(
            (c) => c.name.toLowerCase().includes(lowerCat) || lowerCat.includes(c.name.toLowerCase())
          );
          if (matchedCat) chosenCategoryId = matchedCat.id;
        }

        // 3. Format Date
        let formattedDate = tx.date;
        if (!formattedDate || !/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
          if (tx.day && tx.day >= 1 && tx.day <= 31) {
            const [y, m] = currentMonth.split('-');
            formattedDate = `${y}-${m}-${String(tx.day).padStart(2, '0')}`;
          } else {
            formattedDate = new Date().toISOString().split('T')[0];
          }
        }

        return {
          ...tx,
          id: `row-${Date.now()}-${idx}`,
          amount: Math.abs(Number(tx.amount)) || 0,
          date: formattedDate,
          selected: true,
          accountId: chosenAccountId,
          categoryId: chosenCategoryId,
        };
      });

      setItems(mappedRows);
    } catch (err: any) {
      console.error('Scan error:', err);
      let errMsg = 'Không thể nhận diện hình ảnh từ máy chủ AI.';

      if (typeof err === 'string') {
        errMsg = err;
      } else if (typeof err?.message === 'string' && err.message !== '[object Object]') {
        errMsg = err.message;
      } else if (typeof err?.error === 'string') {
        errMsg = err.error;
      } else if (err?.error?.message && typeof err.error.message === 'string') {
        errMsg = err.error.message;
      } else {
        try {
          const str = JSON.stringify(err);
          if (str && str !== '{}') errMsg = str;
        } catch {
          // ignore
        }
      }

      if (
        errMsg.includes('503') ||
        errMsg.includes('high demand') ||
        errMsg.includes('UNAVAILABLE')
      ) {
        errMsg =
          'Mô hình AI tạm thời đang chịu tải cao (503). Vui lòng bấm "Thử lại ngay" để hệ thống chuyển sang mô hình dự phòng nhẹ hơn.';
      } else if (errMsg.includes('404')) {
        errMsg =
          'Máy chủ AI đang làm nóng khởi động. Vui lòng bấm "Thử lại ngay".';
      }

      setScanError(errMsg);

      // If failed, create at least 1 empty row so user can quickly type looking at the photo
      if (items.length === 0) {
        setItems([
          {
            id: `row-${Date.now()}-0`,
            type: 'expense',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            description: '',
            selected: true,
            accountId: activeAccountId || accounts[0]?.id || '',
            categoryId: categories.find((c) => c.type === 'expense')?.id || '',
          },
        ]);
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Retry scan
  const handleRetryScan = () => {
    if (imagePreview && currentFile) {
      runScan(imagePreview, currentFile.type);
    } else if (imagePreview) {
      runScan(imagePreview, 'image/png');
    }
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  // Toggle select all
  const allSelected = items.length > 0 && items.every((i) => i.selected);
  const handleToggleSelectAll = () => {
    const nextVal = !allSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextVal })));
  };

  // Update a field in a row
  const handleUpdateItem = (id: string, field: keyof EditableTransactionRow, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // If type changed, reset category to first of that type
        if (field === 'type') {
          const typeCats = categories.filter((c) => c.type === value);
          updated.categoryId = typeCats[0]?.id || '';
        }
        return updated;
      })
    );
  };

  // Delete a row
  const handleDeleteRow = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Add a manual row
  const handleAddRow = () => {
    const newRow: EditableTransactionRow = {
      id: `row-${Date.now()}-${items.length}`,
      type: 'expense',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      selected: true,
      accountId: activeAccountId || accounts[0]?.id || '',
      categoryId: categories.find((c) => c.type === 'expense')?.id || '',
    };
    setItems((prev) => [...prev, newRow]);
  };

  // Demo: Loads exact 5 transactions from Timo screenshot
  const handleLoadDemoTimoList = () => {
    setScanError(null);
    setSaveSuccess(false);
    setIsScanning(true);

    setTimeout(() => {
      const demoTimoRows: EditableTransactionRow[] = [
        {
          id: `demo-1`,
          type: 'expense',
          amount: 29000,
          date: `${currentMonth}-30`,
          day: 30,
          description: 'Đến FPT PHARMA',
          note: 'Mua thuốc cảm cúm & khẩu trang',
          categorySuggestion: 'Sức khỏe',
          rawSummary: 'Đến FPT PHARMA: -29.000đ',
          selected: true,
          accountId: activeAccountId || accounts[0]?.id || '',
          categoryId: categories.find((c) => c.name.toLowerCase().includes('sức') || c.type === 'expense')?.id || '',
        },
        {
          id: `demo-2`,
          type: 'expense',
          amount: 490000,
          date: `${currentMonth}-27`,
          day: 27,
          description: 'Đến TRAN HAU CAN',
          note: 'Tiền liên hoan ăn uống nhóm',
          categorySuggestion: 'Ăn uống',
          rawSummary: 'Đến TRAN HAU CAN: -490.000đ',
          selected: true,
          accountId: activeAccountId || accounts[0]?.id || '',
          categoryId: categories.find((c) => c.name.toLowerCase().includes('ăn') || c.type === 'expense')?.id || '',
        },
        {
          id: `demo-3`,
          type: 'expense',
          amount: 500000,
          date: `${currentMonth}-27`,
          day: 27,
          description: 'Đến NGUYEN THI THANH',
          note: 'Mua đồ gia dụng phòng khách',
          categorySuggestion: 'Mua sắm',
          rawSummary: 'Đến NGUYEN THI THANH: -500.000đ',
          selected: true,
          accountId: activeAccountId || accounts[0]?.id || '',
          categoryId: categories.find((c) => c.name.toLowerCase().includes('mua') || c.type === 'expense')?.id || '',
        },
        {
          id: `demo-4`,
          type: 'expense',
          amount: 15000,
          date: `${currentMonth}-23`,
          day: 23,
          description: 'Đến HOANG THI LOAN',
          note: 'Cà phê sáng',
          categorySuggestion: 'Ăn uống',
          rawSummary: 'Đến HOANG THI LOAN: -15.000đ',
          selected: true,
          accountId: activeAccountId || accounts[0]?.id || '',
          categoryId: categories.find((c) => c.name.toLowerCase().includes('ăn') || c.type === 'expense')?.id || '',
        },
        {
          id: `demo-5`,
          type: 'expense',
          amount: 250000,
          date: `${currentMonth}-23`,
          day: 23,
          description: 'Đến LE MINH SON',
          note: 'Sinh hoạt phí gia đình',
          categorySuggestion: 'Chi tiêu khác',
          rawSummary: 'Đến LE MINH SON: -250.000đ',
          selected: true,
          accountId: activeAccountId || accounts[0]?.id || '',
          categoryId: categories.find((c) => c.type === 'expense')?.id || '',
        },
      ];

      setItems(demoTimoRows);
      setOverallSummary('Đã bóc tách đủ 5 giao dịch trong danh sách giao dịch Timo');
      setImagePreview('https://placehold.co/600x800/1e293b/ffffff?text=Danh+sach+giao+dich+Timo+(5+khoan+chi)');
      setIsScanning(false);
    }, 500);
  };

  // Confirm save selected transactions
  const handleSaveSelected = () => {
    const selectedRows = items.filter((i) => i.selected && i.amount > 0);
    if (selectedRows.length === 0) {
      alert('Vui lòng chọn ít nhất 1 giao dịch có số tiền hợp lệ (> 0 đ)');
      return;
    }

    const payload = selectedRows.map((r) => ({
      amount: r.amount,
      type: r.type,
      date: r.date,
      accountId: r.accountId,
      categoryId: r.categoryId || (categories.find((c) => c.type === r.type)?.id || ''),
      description: r.description.trim() || (r.type === 'income' ? 'Khoản thu ngân hàng' : 'Khoản chi ngân hàng'),
      note: r.note?.trim() || undefined,
    }));

    onSaveTransactions(payload);
    setSaveSuccess(true);

    setTimeout(() => {
      onClose();
      setImagePreview(null);
      setItems([]);
      setSaveSuccess(false);
    }, 900);
  };

  // Reset to upload another image
  const handleReset = () => {
    setImagePreview(null);
    setCurrentFile(null);
    setItems([]);
    setScanError(null);
    setSaveSuccess(false);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const selectedCount = items.filter((i) => i.selected && i.amount > 0).length;
  const totalChiSelected = items
    .filter((i) => i.selected && i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0);
  const totalThuSelected = items
    .filter((i) => i.selected && i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[94vh] border border-slate-200">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-teal-800 via-emerald-800 to-sky-900 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md">
              <Camera className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Quét Ảnh & Danh Sách Giao Dịch AI</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 fill-current" />
                  Bóc Tách Tất Cả Giao Dịch
                </span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Hỗ trợ cả thông báo 1 giao dịch lẻ và ảnh chụp <strong>Danh sách nhiều giao dịch</strong> liên tiếp
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: UPLOAD ZONE */}
          {!imagePreview && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50 scale-101'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">
                    Bấm để tải ảnh lên hoặc kéo thả vào đây
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Chụp màn hình <strong>Danh sách giao dịch</strong> (như Timo, VCB, MB...) hoặc thông báo SMS / hóa đơn. AI sẽ tự động đọc và bóc tách <strong>TẤT CẢ các dòng giao dịch</strong>!
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <FileImage className="w-4 h-4" />
                    <span>Chọn ảnh từ máy / điện thoại</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cameraInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Chụp ảnh trực tiếp</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full font-medium mt-1">
                  💡 Mẹo: Bạn có thể nhấn <strong>Ctrl + V</strong> để dán ảnh chụp màn hình ngay lập tức!
                </div>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {/* Demo test helper */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Thử nghiệm nhanh mẫu Danh Sách Giao Dịch Timo:</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLoadDemoTimoList}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <span>⚡ Bấm thử mẫu Timo (5 giao dịch: FPT Pharma, Tran Hau Can...)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hệ thống hỗ trợ đọc cùng lúc nhiều dòng giao dịch trong 1 ảnh và cho phép bạn chọn lưu hàng loạt vào Sổ Thu Chi.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: SCANNING SPINNER */}
          {isScanning && (
            <div className="py-14 flex flex-col items-center justify-center gap-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  AI đang bóc tách toàn bộ danh sách giao dịch...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Đang nhận diện từng dòng: số tiền, người nhận, ngày tháng và tự động phân loại Thu / Chi
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS (TABLE & FORM) */}
          {imagePreview && !isScanning && (
            <div className="space-y-4">
              {/* Error banner with Retry button if 503 or error occurred */}
              {scanError && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <div className="font-extrabold text-amber-900">
                        {scanError}
                      </div>
                      <div className="text-[11px] text-amber-800">
                        Bạn có thể bấm &quot;Thử lại quét AI&quot; hoặc tự nhập nhanh các dòng giao dịch từ ảnh bên trái.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRetryScan}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử Lại Ngay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-amber-300 transition-colors"
                    >
                      Đổi ảnh khác
                    </button>
                  </div>
                </div>
              )}

              {/* Success / Status Summary Toolbar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <span>Phát hiện {items.length} giao dịch trong ảnh</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        Đã chọn {selectedCount}/{items.length}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {overallSummary || 'Kiểm tra lại thông tin và bấm nút Lưu bên dưới'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {totalChiSelected > 0 && (
                    <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      Tổng Chi: -{formatCurrency(totalChiSelected)}
                    </span>
                  )}
                  {totalThuSelected > 0 && (
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      Tổng Thu: +{formatCurrency(totalThuSelected)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đổi ảnh</span>
                  </button>
                </div>
              </div>

              {/* Main Content: Thumbnail + Transactions List */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Left: Thumbnail image preview */}
                <div className="lg:col-span-4 bg-slate-100 rounded-2xl p-2.5 border border-slate-200 flex flex-col items-center">
                  <div className="relative w-full max-h-[460px] rounded-xl overflow-hidden shadow-inner bg-slate-900/5 flex items-center justify-center">
                    <img
                      src={imagePreview}
                      alt="Ảnh danh sách giao dịch đã quét"
                      className="w-full h-auto max-h-[460px] object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full px-2 pt-2 text-[11px] text-slate-500 font-medium">
                    <span>Ảnh gốc đã tải lên</span>
                    <button
                      type="button"
                      onClick={handleRetryScan}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Quét lại ảnh</span>
                    </button>
                  </div>
                </div>

                {/* Right: Table of all extracted transactions */}
                <div className="lg:col-span-8 flex flex-col gap-3">
                  {/* Batch Controls */}
                  <div className="flex items-center justify-between bg-white px-2 py-1">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>{allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả giao dịch'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Thêm dòng</span>
                    </button>
                  </div>

                  {/* List / Cards for each transaction */}
                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {items.map((item, index) => {
                      const typeCats = categories.filter((c) => c.type === item.type);
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all ${
                            item.selected
                              ? item.type === 'income'
                                ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                                : 'bg-rose-50/40 border-rose-300 shadow-2xs'
                              : 'bg-slate-50 border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                            {/* Checkbox & Type Switcher */}
                            <div className="sm:col-span-3 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleSelect(item.id)}
                                className="text-slate-500 hover:text-slate-900"
                              >
                                {item.selected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300" />
                                )}
                              </button>

                              {/* Toggle Chi / Thu */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateItem(item.id, 'type', item.type === 'expense' ? 'income' : 'expense')
                                }
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all ${
                                  item.type === 'income'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-rose-600 text-white shadow-xs'
                                }`}
                                title="Bấm để đổi giữa Chi và Thu"
                              >
                                {item.type === 'income' ? (
                                  <>
                                    <TrendingUp className="w-3 h-3" />
                                    <span>Thu (+)</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="w-3 h-3" />
                                    <span>Chi (-)</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Số tiền */}
                            <div className="sm:col-span-3">
                              <div className="relative">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  required
                                  value={item.amount || ''}
                                  onChange={(e) => handleUpdateItem(item.id, 'amount', Number(e.target.value) || 0)}
                                  placeholder="0"
                                  className={`w-full px-2.5 py-1.5 text-xs font-black rounded-xl border focus:outline-none focus:ring-2 bg-white ${
                                    item.type === 'income'
                                      ? 'text-emerald-700 border-emerald-300 focus:ring-emerald-400'
                                      : 'text-rose-700 border-rose-300 focus:ring-rose-400'
                                  }`}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                  đ
                                </span>
                              </div>
                            </div>

                            {/* Ngày */}
                            <div className="sm:col-span-2">
                              <input
                                type="date"
                                required
                                value={item.date}
                                onChange={(e) => handleUpdateItem(item.id, 'date', e.target.value)}
                                className="w-full px-2 py-1.5 text-[11px] font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            </div>

                            {/* Ngân hàng */}
                            <div className="sm:col-span-3">
                              <select
                                value={item.accountId}
                                onChange={(e) => handleUpdateItem(item.id, 'accountId', e.target.value)}
                                className="w-full px-2 py-1.5 text-[11px] font-bold rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              >
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Nút xóa dòng */}
                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(item.id)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: [ Nội dung ] | [ Note ] | [ Danh mục ] */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-2 pt-2 border-t border-slate-200/60 items-center">
                            {/* Cột 1: Nội dung từ ảnh */}
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                placeholder="Nội dung giao dịch..."
                                title="Nội dung giao dịch"
                                className="w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              />
                            </div>

                            {/* Cột 2: Note (Mục note để bạn ghi rõ thêm) */}
                            <div className="sm:col-span-4">
                              <input
                                type="text"
                                value={item.note || ''}
                                onChange={(e) => handleUpdateItem(item.id, 'note', e.target.value)}
                                placeholder="Note (Ghi rõ thêm)..."
                                title="Ghi rõ thêm thông tin ghi chú cho giao dịch này"
                                className="w-full px-2.5 py-1.5 text-[11px] font-semibold rounded-xl border-2 border-amber-300 bg-amber-50/40 hover:bg-white text-slate-900 placeholder:text-amber-800/60 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 shadow-2xs transition-all"
                              />
                            </div>

                            {/* Cột 3: Danh mục */}
                            <div className="sm:col-span-4">
                              <select
                                value={item.categoryId}
                                onChange={(e) => handleUpdateItem(item.id, 'categoryId', e.target.value)}
                                className="w-full px-2 py-1.5 text-[11px] font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                              >
                                {typeCats.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Primary Save Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveSelected}
                      disabled={saveSuccess || selectedCount === 0}
                      className={`w-full py-3 px-4 rounded-2xl text-sm font-black text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                        saveSuccess
                          ? 'bg-emerald-700 cursor-default'
                          : selectedCount === 0
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.01] active:scale-[0.99] ring-2 ring-emerald-400/40'
                      }`}
                    >
                      {saveSuccess ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>Đã Lưu Toàn Bộ Giao Dịch Vào Sổ Thu Chi!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          <span>
                            Lưu {selectedCount} Giao Dịch Đã Chọn Vào Sổ Thu Chi
                            {totalChiSelected > 0 && ` (Chi: -${formatCurrency(totalChiSelected)})`}
                            {totalThuSelected > 0 && ` (Thu: +${formatCurrency(totalThuSelected)})`}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Tự động nhận diện đầy đủ danh sách giao dịch không bỏ sót dòng nào</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-slate-200 font-bold text-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
