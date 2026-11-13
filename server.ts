import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const RECEIPT_MODEL = 'gemini-3.5-flash-lite';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const VALID_CATEGORIES = [
  'Food & Dining',
  'Stay & Lodging',
  'Transport',
  'Activities',
  'Shopping',
  'Other',
] as const;

const VALID_CURRENCIES = ['INR', 'USD', 'EUR', 'JPY'] as const;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/receipts/parse', async (req, res) => {
    try {
      const { text, defaultCurrency = 'INR', memberNames = [] } = req.body ?? {};

      if (typeof text !== 'string' || text.trim().length < 3) {
        res.status(400).json({
          error: 'Please paste a receipt or chat note with at least a few words.',
        });
        return;
      }

      if (text.length > 12000) {
        res.status(400).json({
          error: 'Receipt text is too long. Please keep it under 12,000 characters.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Check your GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      const safeDefaultCurrency = VALID_CURRENCIES.includes(defaultCurrency)
        ? defaultCurrency
        : 'INR';

      const cleanMembers = Array.isArray(memberNames)
        ? memberNames
            .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
            .slice(0, 25)
        : [];

      const systemInstruction = `You are a precision financial receipt and group expense parser for SplitnPay.
Your job is to extract structured line items, quantities, prices, taxes, tips, discounts, merchant/title, category, date, and currency from messy restaurant receipts, bar tabs, or casual group chat notes.

Rules:
1. Extract every distinct purchased item into "items". Each item's "totalPrice" must be the line-item total (quantity * unit price) as a positive number. Never include tax, subtotal, service charge, tip, or final total rows inside "items".
2. Put all taxes (GST, VAT, sales tax, consumption tax, CGST/SGST) and mandatory service charges into "tax" as a single summed number (0 if none).
3. Put gratuity/tip into "tip" as a number (0 if none).
4. Put discounts/coupons into "discount" as a positive number (0 if none).
5. Detect the currency from symbols or codes (₹/Rs/INR -> INR, $/USD -> USD, €/EUR -> EUR, ¥/JPY/円 -> JPY). If unclear, use "${safeDefaultCurrency}".
6. For "category", choose the single best match from: ${VALID_CATEGORIES.join(', ')}.
7. For "date", return YYYY-MM-DD if clearly present, otherwise "".
8. The trip members are: ${cleanMembers.length > 0 ? cleanMembers.join(', ') : 'None provided'}.
   If the text explicitly indicates who had or shared an item (e.g. "Maya and Elena split tempura", "everyone shared drinks", "Aarav had ramen"), populate "suggestedClaimants" with the exact matching names from the trip members list. If "everyone"/"all" is mentioned for an item, include all trip member names. If not specified for an item, return an empty array [].`;

      const response = await ai.models.generateContent({
        model: RECEIPT_MODEL,
        contents: `Parse this receipt or expense note:\n\n${text.trim()}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Short merchant, restaurant, or bill title.',
              },
              category: {
                type: Type.STRING,
                description: `One of: ${VALID_CATEGORIES.join(', ')}`,
              },
              date: {
                type: Type.STRING,
                description: 'YYYY-MM-DD if detected, else empty string.',
              },
              currency: {
                type: Type.STRING,
                description: 'One of: INR, USD, EUR, JPY',
              },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    totalPrice: { type: Type.NUMBER },
                    suggestedClaimants: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
              tax: { type: Type.NUMBER },
              tip: { type: Type.NUMBER },
              discount: { type: Type.NUMBER },
              notes: {
                type: Type.STRING,
                description: 'Brief note if anything was ambiguous.',
              },
            },
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      const currency = VALID_CURRENCIES.includes(parsed.currency)
        ? parsed.currency
        : safeDefaultCurrency;

      const category = VALID_CATEGORIES.includes(parsed.category)
        ? parsed.category
        : 'Food & Dining';

      const items = Array.isArray(parsed.items)
        ? parsed.items
            .map((it: Record<string, unknown>, idx: number) => ({
              id: `rcp-item-${Date.now()}-${idx}`,
              name: typeof it.name === 'string' && it.name.trim() ? it.name.trim() : `Item ${idx + 1}`,
              quantity: Math.max(1, Number(it.quantity) || 1),
              totalPrice: Math.max(0, Number(it.totalPrice) || 0),
              suggestedClaimants: Array.isArray(it.suggestedClaimants)
                ? it.suggestedClaimants.filter((c): c is string => typeof c === 'string')
                : [],
            }))
            .filter((it: { totalPrice: number; name: string }) => it.totalPrice > 0 || it.name.length > 0)
        : [];

      const dateStr =
        typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date.trim())
          ? parsed.date.trim()
          : '';

      res.json({
        title:
          typeof parsed.title === 'string' && parsed.title.trim()
            ? parsed.title.trim()
            : 'Parsed Receipt',
        category,
        date: dateStr,
        currency,
        items,
        tax: Math.max(0, Number(parsed.tax) || 0),
        tip: Math.max(0, Number(parsed.tip) || 0),
        discount: Math.max(0, Number(parsed.discount) || 0),
        notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
      });
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
      const message =
        errorObj?.message || 'Unable to parse receipt right now. Please try again.';

      if (status === 403 || status === 400 || message.includes('API_KEY')) {
        res.status(status >= 400 && status < 500 ? status : 400).json({
          error:
            'Gemini API request failed. Please check your GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      if (status === 429) {
        res.status(429).json({
          error: 'Rate limit reached while parsing receipt. Please wait a moment and retry.',
        });
        return;
      }

      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SplitnPay server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
