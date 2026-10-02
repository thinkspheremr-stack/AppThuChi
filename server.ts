import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Always use port 3000 for the app (Nginx in container listens on 8080 and proxies to 3000)
  const portArgIndex = process.argv.indexOf('--port');
  const portArg = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT = portArg || Number(process.env.DEFAULT_APP_PORT) || 3000;

  // CORS and Preflight handler with full credentials support
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie'
    );
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // Body parsing with 32MB limit for high-res screenshots
  app.use(express.json({ limit: '32mb' }));
  app.use(express.urlencoded({ extended: true, limit: '32mb' }));

  // Initialize Gemini API client on server-side
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Candidate models: gemini-3.1-flash-lite is fastest and most stable for vision OCR,
  // followed by gemini-flash-latest and gemini-3.8-flash
  const CANDIDATE_MODELS = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  // API Route: Check scan-receipt endpoint availability
  app.get(['/api/scan-receipt', '/api/scan-receipt/'], (_req, res) => {
    res.json({
      status: 'active',
      models: CANDIDATE_MODELS,
      message: 'Endpoint sẵn sàng nhận POST request chứa imageBase64',
    });
  });

  // API Route: Scan & Extract ALL Transaction Details from Image
  app.post(['/api/scan-receipt', '/api/scan-receipt/'], async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'Vui lòng cung cấp dữ liệu hình ảnh (imageBase64)',
        });
      }

      // Robust extraction of pure base64 data regardless of prefix format
      let cleanedBase64 = imageBase64;
      if (typeof imageBase64 === 'string' && imageBase64.includes(';base64,')) {
        cleanedBase64 = imageBase64.split(';base64,')[1];
      } else if (typeof imageBase64 === 'string') {
        cleanedBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      }
      cleanedBase64 = cleanedBase64.replace(/\s+/g, '');

      // Determine accurate MIME type
      let validMimeType = 'image/jpeg';
      if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:image/')) {
        const detected = imageBase64.split(';')[0].replace('data:', '').trim();
        if (detected) validMimeType = detected;
      } else if (mimeType && mimeType.startsWith('image/')) {
        validMimeType = mimeType;
      }

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

CHÚ Ý QUY ĐỔI SỐ TIỀN THEO TIỀN TỆ VIỆT NAM (VND):
- Dấu chấm '.' trong số tiền tiếng Việt là dấu phân cách hàng nghìn!
  * '-29.000' có nghĩa là 29000 VND (hai mươi chín nghìn đồng, KHÔNG PHẢI 29 đồng).
  * '-490.000' có nghĩa là 490000 VND.
  * '-500.000' có nghĩa là 500000 VND.
  * '-15.000' có nghĩa là 15000 VND.
  * '-250.000' có nghĩa là 250000 VND.
- Thuộc tính 'amount' luôn là SỐ NGUYÊN DƯƠNG (ví dụ 29000, 490000, 500000, 15000, 250000).

Quy tắc phân loại từng giao dịch:
- 'type':
  * 'income' (tiền vào) nếu có dấu '+', nhận tiền, chuyển khoản đến, lương, thưởng, hoàn tiền...
  * 'expense' (tiền ra) nếu có dấu '-', 'Đến [Tên người/cửa hàng]', thanh toán, mua sắm, rút tiền, trừ phí...
  * 'transfer' nếu là chuyển tiền nội bộ giữa các tài khoản ngân hàng hoặc chuyển tiết kiệm.
- 'amount': Số tiền dương tính bằng VND (ví dụ 29000, 490000, 500000).
- 'date': Ngày giao dịch (định dạng YYYY-MM-DD). Nếu trên ảnh ghi 'Hôm qua' hoặc ngày/tháng (ví dụ 27/09/2026 hoặc 23/09), hãy chuẩn hóa thành YYYY-MM-DD với năm 2026.
- 'day': Số ngày trong tháng (1 đến 31).
- 'description': Tên người nhận/người gửi hoặc nội dung (ví dụ: 'Đến FPT PHARMA', 'Đến TRAN HAU CAN', 'Đến NGUYEN THI THANH').
- 'bankName': Tên ngân hàng nhận diện được từ logo/giao diện (ví dụ: Timo, Vietcombank, Techcombank, MB Bank...).
- 'categorySuggestion': Gợi ý danh mục phù hợp nhất: 'Ăn uống', 'Mua sắm & Quần áo', 'Xăng xe & Đi lại', 'Cà phê & Giải trí', 'Điện, Nước & Internet', 'Nhà ở & Tiền phòng', 'Sức khỏe & Thuốc men', 'Học tập & Sách vở', 'Hiếu hỉ & Quà tặng', 'Chi tiêu khác'.`;

      let responseText: string | undefined;
      let lastErrorMessage: string = '';

      // Fallback chain across candidate models
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
                          description:
                            "'income' cho tiền vào (+), 'expense' cho tiền ra (-), 'transfer' cho chuyển khoản",
                        },
                        amount: {
                          type: Type.NUMBER,
                          description: 'Số tiền giao dịch bằng VND (số nguyên dương, ví dụ 29000, 490000)',
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
                          description:
                            'Tên ngân hàng hoặc ví (Timo, Vietcombank, MB Bank, v.v.)',
                        },
                        accountNumber: {
                          type: Type.STRING,
                          description: 'Số tài khoản nếu có',
                        },
                        description: {
                          type: Type.STRING,
                          description:
                            'Tên người nhận, người gửi hoặc nội dung chi tiết',
                        },
                        note: {
                          type: Type.STRING,
                          description:
                            'Ghi chú phụ hoặc chi tiết thêm nếu có (ví dụ số tài khoản, ghi chú phụ, v.v.)',
                        },
                        categorySuggestion: {
                          type: Type.STRING,
                          description:
                            'Gợi ý danh mục phù hợp (Ăn uống, Sức khỏe & Thuốc men, Mua sắm & Quần áo, v.v.)',
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
                    description:
                      'Tóm tắt tổng quan về toàn bộ các giao dịch phát hiện được',
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
          let errStr = err?.message || String(err);
          if (err?.error?.message) {
            errStr = err.error.message;
          }
          lastErrorMessage = errStr;
          console.warn(`Model ${modelName} encountered error:`, lastErrorMessage);

          // Short delay before fallback
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

      // Robust JSON extraction
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
      }

      let parsedData: any;
      try {
        parsedData = JSON.parse(cleanJson);
      } catch (jsonErr) {
        console.error('Lỗi parse JSON từ Gemini:', jsonErr, responseText);
        parsedData = {
          transactions: [],
          overallSummary: 'Đã nhận diện ảnh nhưng cần bổ sung chi tiết thủ công.',
        };
      }

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error('Lỗi khi quét ảnh giao dịch:', err);

      let cleanMsg = 'Không thể nhận diện hình ảnh giao dịch';
      if (typeof err?.message === 'string') {
        cleanMsg = err.message;
      } else if (typeof err === 'string') {
        cleanMsg = err;
      } else if (err?.error?.message) {
        cleanMsg = String(err.error.message);
      }

      // Try parsing if cleanMsg is a raw JSON string like {"error":{"code":503...}}
      if (cleanMsg.startsWith('{') && cleanMsg.includes('"message"')) {
        try {
          const parsed = JSON.parse(cleanMsg);
          if (parsed?.error?.message) {
            cleanMsg = parsed.error.message;
          }
        } catch {
          // ignore
        }
      }

      const isHighDemand =
        cleanMsg.includes('503') ||
        cleanMsg.includes('high demand') ||
        cleanMsg.includes('UNAVAILABLE');

      return res.status(500).json({
        success: false,
        error: isHighDemand
          ? 'Hệ thống AI tạm thời đang chịu tải cao (503). Đang kích hoạt thử lại tự động.'
          : cleanMsg,
      });
    }
  });

  // Health check
  app.get(['/api/health', '/api/health/'], (_req, res) => {
    res.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV,
      port: PORT,
    });
  });

  // Integrate Vite for dev mode or serve static files in production
  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
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
