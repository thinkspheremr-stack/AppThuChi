import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Body parsing with 25MB limit for high-res screenshots
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Initialize Gemini API client on server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Candidate models for automatic fallback on 503 / high demand spikes
  const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-3.1-flash-lite',
  ];

  // API Route: Scan & Extract ALL Transaction Details from Image (Supports both single receipts and full transaction history lists)
  app.post('/api/scan-receipt', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp dữ liệu hình ảnh (imageBase64)',
        });
      }

      // Clean prefix if data URL format is passed (e.g. data:image/png;base64,...)
      const cleanedBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const validMimeType = mimeType || 'image/png';

      const prompt = `Bạn là chuyên gia kế toán và trợ lý tài chính AI thông minh chuyên phân tích ảnh chụp màn hình ngân hàng tại Việt Nam (Timo, Vietcombank, MB Bank, Techcombank, ACB, BIDV, Agribank, TPBank, VPBank, MoMo, ZaloPay, v.v.).

LƯU Ý CỰC KỲ QUAN TRỌNG:
1. Ảnh có thể là:
   - Một DANH SÁCH LỊCH SỬ NHIỀU GIAO DỊCH (ví dụ màn hình 'Danh sách giao dịch' của Timo, Vietcombank... hiển thị 3, 5, 10 khoản chi/thu nối tiếp nhau).
   - Hoặc một BIÊN LAI / THÔNG BÁO 1 GIAO DỊCH LẺ.
2. Bạn BẮT BUỘC PHẢI TRÍCH XUẤT TẤT CẢ các giao dịch xuất hiện trong ảnh vào mảng 'transactions', KHÔNG ĐƯỢC BỎ SÓT bất kỳ dòng nào!
   Ví dụ trong ảnh có:
   - Đến FPT PHARMA: -29.000
   - Đến TRAN HAU CAN: -490.000
   - Đến NGUYEN THI THANH: -500.000
   - Đến HOANG THI LOAN: -15.000
   - Đến LE MINH SON: -250.000
   => Bạn phải trả về đủ 5 phần tử trong mảng 'transactions'!

Quy tắc phân loại từng giao dịch:
- 'type':
  * 'income' (tiền vào) nếu có dấu '+', nhận tiền, chuyển khoản đến, lương, thưởng, hoàn tiền...
  * 'expense' (tiền ra) nếu có dấu '-', 'Đến [Tên người/cửa hàng]', thanh toán, mua sắm, rút tiền, trừ phí...
  * 'transfer' nếu là chuyển tiền nội bộ giữa các tài khoản ngân hàng hoặc chuyển tiết kiệm.
- 'amount': Số tiền dương tính bằng VND (ví dụ 29000, 490000, 500000, 15000, 250000, bỏ dấu - hay +).
- 'date': Ngày giao dịch (định dạng YYYY-MM-DD). Nếu trên ảnh ghi 'Hôm qua' hoặc ngày/tháng (ví dụ 27/09/2026 hoặc 23/09), hãy chuẩn hóa thành YYYY-MM-DD với năm 2026.
- 'day': Số ngày trong tháng (1 đến 31).
- 'description': Tên người nhận/người gửi hoặc nội dung (ví dụ: 'Đến FPT PHARMA', 'Đến TRAN HAU CAN', 'Đến NGUYEN THI THANH').
- 'bankName': Tên ngân hàng nhận diện được từ logo/giao diện (ví dụ: Timo, Vietcombank, Techcombank, MB Bank...).
- 'categorySuggestion': Gợi ý danh mục phù hợp nhất: 'Ăn uống', 'Mua sắm', 'Di chuyển', 'Giải trí', 'Hóa đơn & Tiện ích', 'Nhà cửa', 'Sức khỏe' (cho nhà thuốc FPT Pharma...), 'Giáo dục', 'Lương', 'Thưởng', 'Khác'.`;

      let responseText: string | undefined;
      let lastErrorMessage: string = '';

      // Fallback chain across candidate models with retry
      for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
        const modelName = CANDIDATE_MODELS[i];
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: validMimeType,
                      data: cleanedBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  transactions: {
                    type: Type.ARRAY,
                    description: 'Danh sách TẤT CẢ các giao dịch tìm thấy trong ảnh (không bỏ sót)',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        type: {
                          type: Type.STRING,
                          description: "'income' cho tiền vào (+), 'expense' cho tiền ra (-), 'transfer' cho chuyển khoản",
                        },
                        amount: {
                          type: Type.NUMBER,
                          description: 'Số tiền giao dịch (luôn là số dương)',
                        },
                        date: {
                          type: Type.STRING,
                          description: 'Định dạng YYYY-MM-DD',
                        },
                        day: {
                          type: Type.INTEGER,
                          description: 'Ngày trong tháng từ 1 đến 31',
                        },
                        bankName: {
                          type: Type.STRING,
                          description: 'Tên ngân hàng hoặc ví (Timo, Vietcombank, MB Bank, v.v.)',
                        },
                        accountNumber: {
                          type: Type.STRING,
                          description: 'Số tài khoản nếu có',
                        },
                        description: {
                          type: Type.STRING,
                          description: 'Tên người nhận, người gửi hoặc nội dung chi tiết',
                        },
                        note: {
                          type: Type.STRING,
                          description: 'Ghi chú phụ hoặc chi tiết thêm nếu có (ví dụ số tài khoản, ghi chú phụ, v.v.)',
                        },
                        categorySuggestion: {
                          type: Type.STRING,
                          description: 'Gợi ý danh mục phù hợp (Ăn uống, Sức khỏe, Mua sắm, v.v.)',
                        },
                        rawSummary: {
                          type: Type.STRING,
                          description: 'Tóm tắt ngắn gọn 1 câu',
                        },
                      },
                      required: ['type', 'amount', 'description'],
                    },
                  },
                  overallSummary: {
                    type: Type.STRING,
                    description: 'Tóm tắt tổng quan về toàn bộ các giao dịch phát hiện được',
                  },
                },
                required: ['transactions'],
              },
            },
          });

          if (response.text) {
            responseText = response.text;
            break; // Success!
          }
        } catch (err: any) {
          lastErrorMessage = err?.message || String(err);
          console.warn(`Model ${modelName} encountered error:`, lastErrorMessage);
          // Small pause before trying fallback model
          if (i < CANDIDATE_MODELS.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (!responseText) {
        throw new Error(
          lastErrorMessage ||
            'Hệ thống AI đang chịu tải cao (503). Vui lòng bấm Thử lại sau giây lát.'
        );
      }

      const parsedData = JSON.parse(responseText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Lỗi khi quét ảnh giao dịch:', err);
      return res.status(500).json({
        success: false,
        error:
          err.message?.includes('503') || err.message?.includes('high demand')
            ? 'Hệ thống AI tạm thời đang chịu tải cao (503). Đang kích hoạt chế độ thử lại tự động.'
            : err.message || 'Không thể nhận diện hình ảnh giao dịch',
      });
    }
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', serverTime: new Date().toISOString() });
  });

  // Integrate Vite for dev mode or serve static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sổ Thu Chi Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup error:', error);
  process.exit(1);
});
