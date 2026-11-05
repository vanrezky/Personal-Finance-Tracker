import { GoogleGenAI } from '@google/genai';
import { createVerify } from 'node:crypto';
import { normalizeScanReceiptResult, ScanReceiptValidationError, validateReceiptImageBase64 } from '../src/lib/scanReceiptSchema';

type ScanReceiptRequestBody = {
  imageBase64?: unknown;
  categories?: unknown;
};

type VercelLikeRequest = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  body?: ScanReceiptRequestBody;
  socket?: {
    remoteAddress?: string;
  };
};

type VercelLikeResponse = {
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type FirebaseTokenPayload = {
  aud?: string;
  iss?: string;
  sub?: string;
  exp?: number;
  iat?: number;
  user_id?: string;
  email?: string;
};

const MAX_IMAGE_BASE64_LENGTH = 2_000_000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
let firebaseCertCache: { expiresAt: number; certs: Record<string, string> } | null = null;

function getHeaderValue(header: string | string[] | undefined) {
  if (Array.isArray(header)) return header[0];
  return header;
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64').toString('utf8');
}

function parseJwt(token: string) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new Error('Token tidak valid.');
  }

  return {
    encodedHeader,
    encodedPayload,
    signature,
    header: JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string; kid?: string },
    payload: JSON.parse(decodeBase64Url(encodedPayload)) as FirebaseTokenPayload,
  };
}

async function getFirebaseCerts() {
  const now = Date.now();
  if (firebaseCertCache && firebaseCertCache.expiresAt > now) {
    return firebaseCertCache.certs;
  }

  const response = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  if (!response.ok) {
    throw new Error('Gagal mengambil sertifikat Firebase.');
  }

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSeconds = maxAgeMatch ? Number.parseInt(maxAgeMatch[1], 10) : 3600;
  const certs = await response.json() as Record<string, string>;

  firebaseCertCache = {
    certs,
    expiresAt: now + maxAgeSeconds * 1000,
  };

  return certs;
}

async function verifyFirebaseIdToken(idToken: string, projectId: string) {
  const parsed = parseJwt(idToken);
  if (parsed.header.alg !== 'RS256' || !parsed.header.kid) {
    throw new Error('Token Firebase tidak valid.');
  }

  const certs = await getFirebaseCerts();
  const cert = certs[parsed.header.kid];
  if (!cert) {
    throw new Error('Sertifikat token tidak ditemukan.');
  }

  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${parsed.encodedHeader}.${parsed.encodedPayload}`);
  verifier.end();

  const normalizedSignature = parsed.signature.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizedSignature.length % 4 === 0 ? '' : '='.repeat(4 - (normalizedSignature.length % 4));
  const signatureBuffer = Buffer.from(`${normalizedSignature}${padding}`, 'base64');
  const isSignatureValid = verifier.verify(cert, signatureBuffer);

  if (!isSignatureValid) {
    throw new Error('Signature token tidak valid.');
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  if (parsed.payload.aud !== projectId || parsed.payload.iss !== expectedIssuer) {
    throw new Error('Issuer token tidak cocok.');
  }

  if (!parsed.payload.sub || parsed.payload.sub.length === 0) {
    throw new Error('User token tidak valid.');
  }

  if (!parsed.payload.exp || parsed.payload.exp <= nowInSeconds) {
    throw new Error('Token sudah kedaluwarsa.');
  }

  return parsed.payload;
}

function applyRateLimit(ip: string) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Error('Terlalu banyak permintaan scan struk. Coba lagi dalam 1 menit.');
  }

  entry.count += 1;
  rateLimitStore.set(ip, entry);
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const imageBase64 = req.body?.imageBase64;
  const rawCategories = req.body?.categories;
  const apiKey = process.env.GEMINI_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const authHeader = getHeaderValue(req.headers?.authorization ?? req.headers?.['Authorization']);
  const ip = getHeaderValue(req.headers?.['x-forwarded-for'])?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY belum diset di environment Vercel.' });
    return;
  }

  if (!projectId) {
    res.status(500).json({ error: 'VITE_FIREBASE_PROJECT_ID belum diset di environment Vercel.' });
    return;
  }

  if (typeof imageBase64 === 'string' && imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
    res.status(413).json({ error: 'Ukuran gambar terlalu besar. Coba ambil foto yang lebih ringan.' });
    return;
  }

  if (!validateReceiptImageBase64(imageBase64)) {
    res.status(400).json({ error: 'Gambar struk tidak ditemukan atau formatnya tidak valid.' });
    return;
  }

  if (rawCategories !== undefined && (!Array.isArray(rawCategories) || rawCategories.length > 100 || rawCategories.some((category) => typeof category !== 'string' || !category.trim() || category.length > 100))) {
    res.status(400).json({ error: 'Daftar kategori tidak valid.' });
    return;
  }

  const categories = Array.isArray(rawCategories) ? [...new Set(rawCategories as string[])] : ['Lainnya'];
  if (!categories.includes('Lainnya')) categories.push('Lainnya');

  const imageBytes = Buffer.from(imageBase64, 'base64');
  if (imageBytes.length < 3 || imageBytes[0] !== 0xff || imageBytes[1] !== 0xd8 || imageBytes[2] !== 0xff) {
    res.status(400).json({ error: 'Gambar harus berupa JPEG yang valid.' });
    return;
  }

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi login tidak valid. Silakan login ulang.' });
    return;
  }

  try {
    applyRateLimit(ip);
    await verifyFirebaseIdToken(authHeader.slice(7), projectId);

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Analisis bukti pembayaran atau struk ini dan kembalikan JSON valid dengan bentuk berikut:
      {
        "type": "expense" | "income",
        "amount": number,
        "category": string,
        "note": string,
        "date": "YYYY-MM-DD" | null
      }

      Aturan:
      - type adalah expense untuk uang keluar dan income untuk uang masuk.
      - amount adalah nilai transaksi utama dalam rupiah, angka bulat positif tanpa titik/koma.
      - category harus dipilih persis dari daftar ini: ${categories.join(', ')}.
      - note adalah nama toko/pengirim atau ringkasan singkat, maksimal 50 karakter.
      - date adalah tanggal transaksi yang terlihat dalam format YYYY-MM-DD; gunakan null jika tidak jelas.
      - Jangan gunakan nomor rekening, nomor referensi, atau informasi sensitif sebagai note.
      - Jangan kembalikan markdown atau teks lain selain JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    if (!response.text) {
      res.status(502).json({ error: 'Model tidak mengembalikan hasil.' });
      return;
    }

    const parsed = JSON.parse(response.text) as unknown;
    const normalized = normalizeScanReceiptResult(parsed, categories);
    res.status(200).json(normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const normalizedMessage = message.toLowerCase();
    const isAuthError = normalizedMessage.includes('token') || normalizedMessage.includes('issuer') || normalizedMessage.includes('kedaluwarsa') || normalizedMessage.includes('login');
    if (isAuthError) {
      res.status(401).json({ error: 'Sesi login tidak valid. Silakan login ulang.' });
    } else if (message.includes('Terlalu banyak')) {
      res.status(429).json({ error: 'Terlalu banyak permintaan scan. Coba lagi dalam 1 menit.' });
    } else if (error instanceof ScanReceiptValidationError || error instanceof SyntaxError) {
      res.status(502).json({ error: 'Hasil scan tidak dapat divalidasi. Periksa gambar dan coba lagi.' });
    } else {
      res.status(500).json({ error: 'Gagal menganalisa gambar. Coba lagi beberapa saat.' });
    }
  }
}
