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
 * Automatically downsizes and compresses large phone screenshots (e.g. 10MB - 15MB PNG)
 * to a sensible size (max 1600px, JPEG 0.88) before sending over HTTP.
 * This prevents HTTP 413, network dropouts, 404 proxy drops, and speeds up AI processing 40x.
 */
export async function optimizeImageForScan(
  dataUrl: string
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve) => {
    // If not a data URL or already small (< 400KB), return as is
    if (!dataUrl.startsWith('data:image/') || dataUrl.length < 400000) {
      const mime = dataUrl.startsWith('data:')
        ? dataUrl.split(';')[0].replace('data:', '')
        : 'image/jpeg';
      return resolve({ base64: dataUrl, mimeType: mime });
    }

    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1600;
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
      }

      // Draw white background in case of transparent PNG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to high-quality JPEG
      const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
      resolve({ base64: optimizedDataUrl, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
    };

    img.src = dataUrl;
  });
}

/**
 * Sends image data (base64) to server endpoint /api/scan-receipt
 * which leverages Gemini AI with multi-model fallback to extract structured transaction data.
 * Includes automatic client-side retry for transient 503 / network errors / 404 warmup.
 */
export async function scanReceiptImage(
  rawImageBase64: string,
  rawMimeType: string = 'image/png',
  maxRetries: number = 3
): Promise<ScanReceiptResult> {
  // Step 1: Optimize and compress image before uploading
  let imageBase64 = rawImageBase64;
  let mimeType = rawMimeType;

  try {
    const optimized = await optimizeImageForScan(rawImageBase64);
    imageBase64 = optimized.base64;
    mimeType = optimized.mimeType;
  } catch (e) {
    console.warn('Could not optimize image, using raw data:', e);
  }

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      // Determine endpoint path
      const endpoint = '/api/scan-receipt';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
        }),
      });

      if (!res.ok) {
        let errMsg = `Máy chủ phản hồi lỗi ${res.status}`;
        try {
          const errJson = await res.json();
          if (typeof errJson?.error === 'string') {
            errMsg = errJson.error;
          } else if (errJson?.error?.message) {
            errMsg = String(errJson.error.message);
          } else if (typeof errJson?.message === 'string') {
            errMsg = errJson.message;
          }
        } catch {
          if (res.status === 502 || res.status === 503 || res.status === 504) {
            errMsg =
              'Máy chủ AI đang trong quá trình khởi động hoặc quá tải tạm thời (503). Đang tự động thử lại...';
          }
        }

        // If 503, 404 warmup, or model busy, retry after short backoff
        if (
          res.status === 503 ||
          res.status === 404 ||
          res.status === 502 ||
          errMsg.includes('503') ||
          errMsg.includes('high demand')
        ) {
          attempt++;
          if (attempt <= maxRetries) {
            // Wait 1s, 2s, 3s
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
        }
        throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
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
        note: item.note?.trim() || undefined,
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
        await new Promise((r) => setTimeout(r, 1200 * attempt));
      }
    }
  }

  // If all attempts failed, produce clean user-friendly message
  let cleanMessage = 'Không thể kết nối với dịch vụ nhận diện ảnh';
  if (typeof lastError === 'string') {
    cleanMessage = lastError;
  } else if (typeof lastError?.message === 'string' && lastError.message !== '[object Object]') {
    cleanMessage = lastError.message;
  } else if (typeof lastError?.error === 'string') {
    cleanMessage = lastError.error;
  } else if (lastError?.error?.message) {
    cleanMessage = String(lastError.error.message);
  }
  if (
    cleanMessage.includes('503') ||
    cleanMessage.includes('high demand') ||
    cleanMessage.includes('UNAVAILABLE')
  ) {
    cleanMessage =
      'Mô hình AI hiện đang chịu tải cao (503). Vui lòng bấm "Thử lại ngay" để hệ thống chuyển sang mô hình dự phòng.';
  } else if (cleanMessage.includes('404')) {
    cleanMessage =
      'Máy chủ đang trong quá trình khởi động hoặc làm nóng (404). Vui lòng bấm "Thử lại ngay".';
  }

  throw new Error(cleanMessage);
}
