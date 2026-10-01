export interface ExtractedTransactionItem {
  id?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string; // YYYY-MM-DD
  day?: number; // 1 - 31
  bankName?: string;
  accountNumber?: string;
  description: string;
  note?: string;
  categorySuggestion?: string;
  rawSummary?: string;
  selected?: boolean;
}

export interface ScanReceiptResult {
  transactions: ExtractedTransactionItem[];
  overallSummary?: string;
}

export interface ScanReceiptResponse {
  success: boolean;
  data?: {
    transactions?: ExtractedTransactionItem[];
    overallSummary?: string;
    // Support legacy single-item format if returned
    type?: 'income' | 'expense' | 'transfer';
    amount?: number;
    date?: string;
    day?: number;
    bankName?: string;
    accountNumber?: string;
    description?: string;
    note?: string;
    categorySuggestion?: string;
    rawSummary?: string;
  };
  error?: string;
}

/**
 * Sends image data (base64) to server endpoint /api/scan-receipt
 * which leverages Gemini AI with multi-model fallback to extract structured transaction data.
 * Includes automatic client-side retry for transient 503 / network errors.
 */
export async function scanReceiptImage(
  imageBase64: string,
  mimeType: string = 'image/png',
  maxRetries: number = 2
): Promise<ScanReceiptResult> {
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error || `Máy chủ phản hồi lỗi ${res.status}`;
        
        // If 503 or model busy, retry after short backoff
        if (res.status === 503 || errMsg.includes('503') || errMsg.includes('high demand')) {
          attempt++;
          if (attempt <= maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
        }
        throw new Error(errMsg);
      }

      const json: ScanReceiptResponse = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Không nhận diện được nội dung trong ảnh');
      }

      // Format response to always return a normalized list of transactions
      let items: ExtractedTransactionItem[] = [];

      if (json.data.transactions && Array.isArray(json.data.transactions)) {
        items = json.data.transactions;
      } else if (json.data.amount !== undefined) {
        // Single transaction object fallback
        items = [
          {
            type: json.data.type || 'expense',
            amount: Number(json.data.amount) || 0,
            date: json.data.date || new Date().toISOString().split('T')[0],
            day: json.data.day,
            bankName: json.data.bankName,
            accountNumber: json.data.accountNumber,
            description: json.data.description || 'Giao dịch từ ảnh chụp',
            note: json.data.note,
            categorySuggestion: json.data.categorySuggestion,
            rawSummary: json.data.rawSummary,
            selected: true,
          },
        ];
      }

      // Ensure each item has a unique client id and selected=true
      const normalizedItems: ExtractedTransactionItem[] = items.map((item, index) => ({
        ...item,
        id: item.id || `scanned-${Date.now()}-${index}`,
        amount: Math.abs(Number(item.amount)) || 0,
        date: item.date || new Date().toISOString().split('T')[0],
        type: item.type === 'income' ? 'income' : 'expense',
        description: item.description?.trim() || 'Giao dịch ngân hàng',
        selected: true,
      }));

      return {
        transactions: normalizedItems,
        overallSummary:
          json.data.overallSummary ||
          `Phát hiện ${normalizedItems.length} giao dịch trong ảnh`,
      };
    } catch (error: any) {
      lastError = error;
      attempt++;
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // If all attempts failed
  let cleanMessage = lastError?.message || 'Không thể kết nối với dịch vụ nhận diện ảnh';
  if (cleanMessage.includes('503') || cleanMessage.includes('high demand') || cleanMessage.includes('UNAVAILABLE')) {
    cleanMessage = 'Mô hình AI hiện đang chịu tải cao (503). Vui lòng bấm "Thử lại" hoặc kiểm tra lại thông tin bên dưới.';
  }
  throw new Error(cleanMessage);
}
