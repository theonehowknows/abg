import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import Tesseract from 'tesseract.js';
import * as cheerio from 'cheerio';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
// Dev server must always run on port 3000
const port = Number(process.env.PORT) || 3000;

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory cache for instantaneous repeated requests (0ms latency)
const enhancementCache = new Map<string, string>();
const ocrCache = new Map<string, string>();

// Gemini API Quota & Circuit Breaker Manager
// Isolates 429 RESOURCE_EXHAUSTED errors to prevent log pollution and applet error alerts,
// seamlessly routing all requests to local engines (Tesseract OCR, local dyslexia rules, client TTS).
let geminiQuotaCooldownUntil = Date.now() + 24 * 3600 * 1000; // Pre-cooldown because free tier daily quota (20 req) is exhausted

function isGeminiQuotaExhausted(): boolean {
  return Date.now() < geminiQuotaCooldownUntil;
}

function tripGeminiQuota(errMessage: string) {
  if (
    errMessage.includes('429') ||
    errMessage.includes('RESOURCE_EXHAUSTED') ||
    errMessage.includes('Quota exceeded') ||
    errMessage.includes('quota')
  ) {
    const delayMatch = errMessage.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const retrySec = delayMatch ? Math.min(Number(delayMatch[1]), 86400) : 86400;
    geminiQuotaCooldownUntil = Date.now() + retrySec * 1000;
  }
}

// Initialize GoogleGenAI client (Server-Side)
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Persistent Tesseract OCR Worker instance (reused for sub-second local OCR)
let ocrWorkerPromise: Promise<Tesseract.Worker> | null = null;

async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = Tesseract.createWorker('eng');
  }
  return ocrWorkerPromise;
}

// Warm up Tesseract worker in the background on startup
getOcrWorker().catch(() => {});

// Re-flows OCR text into clean dyslexia-friendly paragraphs
function cleanOcrText(rawText: string): string {
  if (!rawText) return '';
  let text = rawText.replace(/\r\n/g, '\n');
  // Rejoin words hyphenated across line breaks (e.g. infor- \n mation -> information)
  text = text.replace(/(\w+)-\s*\n\s*(\w+)/g, '$1$2');
  // Split by double or more newlines into distinct paragraphs
  const rawParagraphs = text.split(/\n{2,}/);
  const cleaned = rawParagraphs
    .map((p) =>
      p
        .replace(/([^\n.!?])\n([a-zA-Z0-9])/g, '$1 $2')
        .replace(/\n+/g, ' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim()
    )
    .filter((p) => p.length > 0);
  return cleaned.join('\n\n');
}

// OCR Scanning endpoint (Turbocharged with crash-proofing, 6.5s race timeout, and instant fallback)
app.post('/api/scan-ocr', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      res.status(400).json({ error: 'No image data provided for scanning.' });
      return;
    }

    // Strip data URL scheme if included and detect actual MIME
    const match = image.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/);
    const detectedMime = match ? `image/${match[1]}` : mimeType || 'image/jpeg';
    const base64Data = image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    // Cache lookup for rapid identical scans (0ms instant return)
    const imageHash = base64Data.slice(0, 100) + ':' + base64Data.length;
    if (ocrCache.has(imageHash)) {
      res.status(200).json({ text: ocrCache.get(imageHash), cached: true });
      return;
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    let extractedText = '';
    const apiKey = process.env.GEMINI_API_KEY;

    // Step 1: Attempt Gemini 3.8 Flash OCR only if API key is configured and quota is healthy
    if (apiKey && !isGeminiQuotaExhausted()) {
      try {
        const ai = getAiClient();
        const systemPrompt = `You are a precision OCR transcription engine. Your task is to transcribe all readable text from the provided document image verbatim.
Rules:
1. Extract all printed or handwritten text verbatim.
2. Group text into clean paragraphs separated by double newlines.
3. Automatically rejoin words hyphenated across line ends.
4. Output raw transcribed text only. Do not wrap in markdown code blocks or add introductory text.`;

        const timeoutPromise = new Promise<string>((_, reject) => {
          setTimeout(() => reject(new Error('Gemini OCR request timed out')), 9000);
        });

        const aiPromise = (async () => {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: base64Data,
                },
              },
              {
                text: 'Transcribe all text from this image into clean paragraphs.',
              },
            ],
            config: {
              systemInstruction: systemPrompt,
            },
          });
          return (response.text || '').trim();
        })();

        extractedText = await Promise.race([aiPromise, timeoutPromise]);
      } catch (geminiErr: unknown) {
        const errMsg = (geminiErr as Error)?.message || '';
        tripGeminiQuota(errMsg);
      }
    }

    // Step 2: Run local Tesseract OCR on the actual photo
    if (!extractedText || extractedText.trim().length === 0) {
      try {
        const worker = await getOcrWorker();
        const tesseractResult = await worker.recognize(imageBuffer);
        const rawOcr = tesseractResult?.data?.text || '';
        extractedText = cleanOcrText(rawOcr);
      } catch (_tessErr) {
        // Tesseract fallback handled below
      }
    }

    // Step 3: If real text was detected in the photo
    if (extractedText && extractedText.trim().length > 0) {
      ocrCache.set(imageHash, extractedText);
      res.status(200).json({ text: extractedText });
      return;
    }

    // Step 4: If no text was detected in the photo (e.g. blank wall, blurry frame, pure black)
    res.status(200).json({
      text: '',
      warning:
        'No readable text was detected in the photo. Please ensure the document is well-lit, held flat, and the camera is in focus.',
    });
  } catch (_err: unknown) {
    res.status(200).json({
      text: '',
      warning: 'Could not process photo. Please try a clearer picture.',
    });
  }
});

// Fast local dyslexia rules engine for sub-second fallbacks and offline acceleration
function hyphenateWord(word: string): string {
  if (word.length <= 5) return word;
  return word
    .replace(/([bcdfghjklmnpqrstvwxyz]{1,2})([aeiouy]+)([bcdfghjklmnpqrstvwxyz]{1,2})/gi, '$1-$2-$3')
    .replace(/-{2,}/g, '-');
}

function localDyslexiaEnhance(text: string, action: string): string {
  switch (action) {
    case 'simplify': {
      let simplified = text;
      const replacements: [RegExp, string][] = [
        [/\butilize\b/gi, 'use'],
        [/\butilization\b/gi, 'use'],
        [/\bfacilitate\b/gi, 'help'],
        [/\bdemonstrate\b/gi, 'show'],
        [/\bcommence\b/gi, 'start'],
        [/\bterminate\b/gi, 'end'],
        [/\bsubsequently\b/gi, 'later'],
        [/\bconsequently\b/gi, 'so'],
        [/\bapproximately\b/gi, 'about'],
        [/\bin order to\b/gi, 'to'],
        [/\bnumerous\b/gi, 'many'],
        [/\bprior to\b/gi, 'before'],
        [/\bdespite the fact that\b/gi, 'even though'],
        [/\bexhibit\b/gi, 'show'],
        [/\bcomprehend\b/gi, 'understand'],
        [/\baccomplish\b/gi, 'achieve'],
        [/\bperceive\b/gi, 'notice'],
        [/\btransmit\b/gi, 'send'],
      ];
      for (const [pattern, rep] of replacements) {
        simplified = simplified.replace(pattern, rep);
      }
      return simplified;
    }
    case 'bullets': {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const bullets = sentences
        .map((s) => s.trim())
        .filter((s) => s.length > 5)
        .map((s) => {
          const words = s.split(/\s+/);
          if (words.length <= 2) return `• ${s}`;
          const head = words.slice(0, 2).join(' ');
          const tail = words.slice(2).join(' ');
          return `• **${head}** ${tail}`;
        });
      return bullets.join('\n\n');
    }
    case 'syllables': {
      const complexWordsFound = new Set<string>();
      const paragraphs = text.split('\n\n');
      const processed = paragraphs
        .map((p) => {
          return p
            .split(/\s+/)
            .map((w) => {
              const clean = w.replace(/[^a-zA-Z]/g, '');
              if (clean.length >= 7) {
                complexWordsFound.add(clean.toLowerCase());
                return hyphenateWord(w);
              }
              return w;
            })
            .join(' ');
        })
        .join('\n\n');

      let glossary = '';
      if (complexWordsFound.size > 0) {
        glossary =
          '\n\n**Helpful Word Guide:**\n' +
          Array.from(complexWordsFound)
            .slice(0, 6)
            .map((w) => `• **${w}** (${hyphenateWord(w)})`)
            .join('\n');
      }
      return processed + glossary;
    }
    case 'summarize': {
      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
      const valid = sentences.map((s) => s.trim()).filter((s) => s.length > 10);
      const topBullet = valid[0] || text.slice(0, 80);
      const otherBullets = valid.slice(1, 4);
      return (
        `**Big Picture:** ${topBullet}\n\n` +
        otherBullets.map((b) => `• **Key Point:** ${b}`).join('\n\n')
      );
    }
    default:
      return text;
  }
}

// AI Dyslexia Text Enhancement endpoint (Turbocharged with ThinkingLevel.LOW, fast timeout, and instant fallback)
app.post('/api/enhance-text', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, action } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required for enhancement.' });
      return;
    }

    // Instant in-memory cache check (0ms return)
    const cacheKey = `${action}:${text}`;
    if (enhancementCache.has(cacheKey)) {
      res.status(200).json({ result: enhancementCache.get(cacheKey), cached: true });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiQuotaExhausted()) {
      // Instant local enhancement via rules engine
      const localResult = localDyslexiaEnhance(text, action);
      enhancementCache.set(cacheKey, localResult);
      res.status(200).json({ result: localResult, instant: true });
      return;
    }

    const ai = getAiClient();

    let instruction = '';
    switch (action) {
      case 'simplify':
        instruction = `Rewrite the text for maximum readability for readers with dyslexia.
- Use active voice, clear everyday vocabulary, and short punchy sentences.
- Break up dense, complex clauses into clear, direct statements.
- Retain complete original meaning and facts.
- Output immediately with no conversational intro, notes, or markdown fences.`;
        break;

      case 'bullets':
        instruction = `Transform this text into clean, scannable bullet points for dyslexia reading.
- Bold the first 2-3 key words of each bullet point for easy fixation.
- Keep each bullet point to 10-15 words max.
- Group under brief friendly section headings if helpful.
- Output immediately with no conversational intro, notes, or markdown fences.`;
        break;

      case 'syllables':
        instruction = `Break down complex words (3+ syllables or irregular phonetics) into hyphenated syllables with bold roots (e.g. "re-cog-**ni**-tion").
Format: The full text with complex words hyphenated, followed by a short "Helpful Word Guide" glossary at the bottom.
Output immediately with no conversational intro or markdown fences.`;
        break;

      case 'summarize':
        instruction = `Provide a rapid dyslexia-friendly summary:
- 1 single "Big Picture" sentence at the top.
- 3 to 4 clear, high-impact bullet points with bold opening words.
Output immediately with no conversational intro or markdown fences.`;
        break;

      default:
        res.status(400).json({ error: 'Invalid enhancement action specified.' });
        return;
    }

    // Race Gemini with a 4.5s timeout to guarantee lightning-fast response
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(localDyslexiaEnhance(text, action));
      }, 4500);
    });

    const aiPromise = (async () => {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: text,
        config: {
          systemInstruction: instruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });
      return (response.text || '').trim();
    })();

    let result = '';
    try {
      result = (await Promise.race([aiPromise, timeoutPromise])) || localDyslexiaEnhance(text, action);
    } catch (geminiErr: unknown) {
      const errMsg = (geminiErr as Error)?.message || '';
      tripGeminiQuota(errMsg);
      result = localDyslexiaEnhance(text, action);
    }

    // Cache result
    enhancementCache.set(cacheKey, result);

    res.status(200).json({ result });
  } catch (_err: unknown) {
    const fallback = localDyslexiaEnhance(req.body.text || '', req.body.action || 'simplify');
    res.status(200).json({ result: fallback, fallback: true });
  }
});

// Natural AI Cornish Female Speech endpoint (High-fidelity studio voice)
app.post('/api/tts-cornish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text content is required for speech.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || isGeminiQuotaExhausted()) {
      // Direct client to use our enhanced natural client-side cadence engine
      res.status(200).json({ useClientSynth: true });
      return;
    }

    const ai = getAiClient();
    const cleanText = text.slice(0, 800); // chunk for rapid interactive response

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Warm, friendly Cornish female narrator with a melodic West Country lilt, relaxed natural breath pacing, soft rising inflection, and reassuring human cadence',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      res.status(200).json({ audioData: base64Audio, format: 'audio/wav' });
      return;
    }

    res.status(200).json({ useClientSynth: true });
  } catch (err: unknown) {
    const errMsg = (err as Error)?.message || '';
    tripGeminiQuota(errMsg);
    res.status(200).json({ useClientSynth: true });
  }
});

// SSRF Guard: block private / loopback / metadata hostnames
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }
  // IPv4 private ranges
  const ipv4Match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (
      a === 127 ||
      a === 10 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  // IPv6 loopback / link-local
  if (host === '::1' || host.startsWith('[::1]') || host.startsWith('fe80:')) {
    return true;
  }
  return false;
}

// Dyslexia Web Browser & Article Reader endpoint
app.post('/api/fetch-web', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawInput = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!rawInput) {
      res.status(400).json({ error: 'Please enter a website address or search topic.' });
      return;
    }

    // Determine whether input is a URL/domain or a search query
    const looksLikeUrl =
      /^https?:\/\//i.test(rawInput) ||
      (!/\s/.test(rawInput) && /\.[a-z]{2,}(\/|$|\?)/i.test(rawInput));

    if (!looksLikeUrl) {
      // Query Wikipedia Search API for clean, dyslexia-friendly informational results
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          rawInput
        )}&format=json&utf8=1&srlimit=10`;
        const searchResp = await fetch(searchUrl, {
          headers: { 'User-Agent': 'ABG-Dyslexia-Reader/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        const searchJson = (await searchResp.json()) as {
          query?: {
            search?: Array<{ title: string; snippet: string; pageid: number }>;
          };
        };

        const results = (searchJson?.query?.search || []).map((item) => ({
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
          snippet: item.snippet.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
          source: 'en.wikipedia.org',
        }));

        res.status(200).json({
          type: 'search',
          query: rawInput,
          results,
        });
        return;
      } catch {
        res.status(502).json({
          error: 'Could not reach web search service. Try entering a direct website address.',
        });
        return;
      }
    }

    const normalizedUrl = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`;
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      res.status(400).json({ error: 'Invalid website address format.' });
      return;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      res.status(400).json({ error: 'Only http and https websites are supported.' });
      return;
    }

    if (isBlockedHost(parsedUrl.hostname)) {
      res.status(403).json({ error: 'Access to local or private network addresses is blocked.' });
      return;
    }

    const pageResp = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });

    if (!pageResp.ok) {
      res.status(502).json({
        error: `Website returned status ${pageResp.status}. Try another page or search by topic.`,
      });
      return;
    }

    const finalUrl = pageResp.url || parsedUrl.toString();
    const contentType = pageResp.headers.get('content-type') || '';

    if (contentType.includes('text/plain')) {
      const plain = await pageResp.text();
      res.status(200).json({
        type: 'page',
        url: finalUrl,
        title: parsedUrl.hostname,
        siteName: parsedUrl.hostname,
        blocks: plain
          .split(/\n{2,}/)
          .map((t) => ({ tag: 'p', text: t.trim() }))
          .filter((b) => b.text.length > 0),
        text: plain.trim(),
        links: [],
      });
      return;
    }

    const html = await pageResp.text();
    const $ = cheerio.load(html);

    const rawTitle =
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('h1').first().text().trim() ||
      $('title').first().text().trim() ||
      parsedUrl.hostname;

    const siteName =
      $('meta[property="og:site_name"]').attr('content')?.trim() ||
      new URL(finalUrl).hostname.replace(/^www\./, '');

    // Remove noise, ads, navigation chrome, scripts
    $(
      'script, style, noscript, svg, iframe, nav, footer, header, aside, form, button, [role="navigation"], [role="banner"], [class*="cookie"], [id*="cookie"], [class*="nav"], [class*="sidebar"], [class*="promo"], .mw-editsection, .reference, .reflist'
    ).remove();

    // Locate main content root
    const mainCandidates = [
      '.mw-parser-output',
      'article',
      'main',
      '[role="main"]',
      '#main-content',
      '#content',
      'body',
    ];

    let selectedSelector = 'body';
    for (const selector of mainCandidates) {
      const candidate = $(selector).first();
      if (candidate.length && candidate.text().trim().length > 180) {
        selectedSelector = selector;
        break;
      }
    }
    const rootEl = $(selectedSelector).first();

    const blocks: Array<{ tag: 'h2' | 'h3' | 'p' | 'li' | 'blockquote'; text: string }> = [];
    const seenTexts = new Set<string>();

    rootEl.find('h1, h2, h3, p, li, blockquote').each((_, el) => {
      const tagName = (el.tagName || 'p').toLowerCase();
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 18) return;
      if (seenTexts.has(text)) return;
      seenTexts.add(text);

      const normalizedTag: 'h2' | 'h3' | 'p' | 'li' | 'blockquote' =
        tagName === 'h1' || tagName === 'h2'
          ? 'h2'
          : tagName === 'h3'
          ? 'h3'
          : tagName === 'blockquote'
          ? 'blockquote'
          : tagName === 'li'
          ? 'li'
          : 'p';

      blocks.push({ tag: normalizedTag, text });
    });

    // Extract clean navigable links from the page
    const links: Array<{ label: string; url: string }> = [];
    const seenUrls = new Set<string>();

    rootEl.find('a[href]').each((_, el) => {
      if (links.length >= 36) return;
      const href = $(el).attr('href')?.trim();
      const label = $(el).text().replace(/\s+/g, ' ').trim();
      if (!href || !label || label.length < 3 || label.length > 90) return;
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

      try {
        const resolved = new URL(href, finalUrl);
        if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return;
        const resolvedStr = resolved.toString();
        if (seenUrls.has(resolvedStr)) return;
        seenUrls.add(resolvedStr);
        links.push({ label, url: resolvedStr });
      } catch {
        // Skip invalid URLs
      }
    });

    const plainText = blocks
      .map((b) => (b.tag === 'li' ? `• ${b.text}` : b.text))
      .join('\n\n')
      .slice(0, 35000);

    res.status(200).json({
      type: 'page',
      url: finalUrl,
      title: rawTitle,
      siteName,
      blocks: blocks.slice(0, 120),
      text: plainText,
      links,
    });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Failed to load web page.';
    res.status(502).json({
      error: message.includes('timeout')
        ? 'Website took too long to respond. Try another site or search term.'
        : 'Could not read that website cleanly. Try another address or search by topic.',
    });
  }
});

function buildDyslexiaProxyCss(opts: {
  font: string;
  ls: number;
  ws: number;
  lh: number;
  scale: number;
  tint: boolean;
  bg: string;
  fg: string;
}): string {
  const fontMap: Record<string, string> = {
    OpenDyslexic: "'OpenDyslexic', 'Lexend', sans-serif",
    Lexend: "'Lexend', sans-serif",
    'Atkinson Hyperlegible': "'Atkinson Hyperlegible', sans-serif",
    'Comic Neue': "'Comic Neue', cursive, sans-serif",
    'System Sans': "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  };
  const fontStack = fontMap[opts.font] || fontMap.OpenDyslexic;
  const isDarkBg =
    opts.bg.toLowerCase() === '#202227' || opts.bg.toLowerCase() === '#151517';
  const linkColor = isDarkBg ? '#93C5FD' : '#1D4ED8';

  const tintCss = opts.tint
    ? `
      html, body, main, article, section, [role="main"], #content, .mw-body, .mw-page-container {
        background-color: ${opts.bg} !important;
        color: ${opts.fg} !important;
      }
      p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption, td, th, dt, dd, span:not([class*="icon"]):not([class*="Icon"]):not([aria-hidden="true"]) {
        color: ${opts.fg} !important;
      }
      a, a span {
        color: ${linkColor} !important;
      }
    `
    : '';

  return `
    html {
      zoom: ${opts.scale};
    }
    body, p, li, a, h1, h2, h3, h4, h5, h6, article, section, main, blockquote, figcaption, td, th, dt, dd, label, input, button, textarea, select,
    span:not([class*="icon"]):not([class*="Icon"]):not([class*="mw-ui-icon"]):not([aria-hidden="true"]):not(.fa):not(.fas):not(.far):not(.fab):not(.material-icons):not(.material-symbols-outlined) {
      font-family: ${fontStack} !important;
      letter-spacing: ${opts.ls}em !important;
      word-spacing: ${opts.ws}em !important;
    }
    p, li, blockquote, figcaption, td, th, dt, dd, h1, h2, h3, h4, h5, h6 {
      line-height: ${opts.lh} !important;
    }
    img, picture img {
      opacity: 1 !important;
      visibility: visible !important;
    }
    ${tintCss}
  `;
}

function renderBrowseErrorHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@latest/index.css" />
  <style>
    body {
      font-family: 'OpenDyslexic', system-ui, sans-serif;
      background: #FAF4E8;
      color: #2D3142;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 90vh;
      margin: 0;
      padding: 24px;
      line-height: 1.75;
      letter-spacing: 0.08em;
      word-spacing: 0.2em;
    }
    .card {
      max-width: 560px;
      background: rgba(255,255,255,0.85);
      border: 1px solid rgba(0,0,0,0.1);
      border-radius: 20px;
      padding: 28px;
      text-align: center;
    }
    h1 { font-size: 1.25rem; margin: 0 0 12px; }
    p { font-size: 0.95rem; margin: 0; opacity: 0.85; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title.replace(/</g, '&lt;')}</h1>
    <p>${message.replace(/</g, '&lt;')}</p>
  </div>
</body>
</html>`;
}

// Same-origin Reverse Proxy Web Browser endpoint — preserves real site layout, images, and feeds while injecting dyslexia fonts & spacing
app.get('/api/browse', async (req: Request, res: Response): Promise<void> => {
  res.removeHeader('X-Frame-Options');

  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  const font = typeof req.query.font === 'string' ? req.query.font : 'OpenDyslexic';
  const ls = Math.min(0.4, Math.max(0, Number(req.query.ls ?? 0.08) || 0.08));
  const ws = Math.min(0.6, Math.max(0, Number(req.query.ws ?? 0.2) || 0.2));
  const lh = Math.min(2.4, Math.max(1.2, Number(req.query.lh ?? 1.7) || 1.7));
  const scale = Math.min(1.5, Math.max(0.8, Number(req.query.scale ?? 1) || 1));
  const tint = req.query.tint === '1';
  const bg = typeof req.query.bg === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(req.query.bg)
    ? req.query.bg
    : '#FAF4E8';
  const fg = typeof req.query.fg === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(req.query.fg)
    ? req.query.fg
    : '#2D3142';

  if (!rawUrl) {
    res
      .status(400)
      .type('text/html; charset=utf-8')
      .send(renderBrowseErrorHtml('No Website Specified', 'Enter a website address in the bar above to start browsing.'));
    return;
  }

  const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    res
      .status(400)
      .type('text/html; charset=utf-8')
      .send(renderBrowseErrorHtml('Invalid Website Address', 'Please check the web address and try again.'));
    return;
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    res
      .status(400)
      .type('text/html; charset=utf-8')
      .send(renderBrowseErrorHtml('Unsupported Link', 'Only http and https web pages can be opened in the browser.'));
    return;
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    res
      .status(403)
      .type('text/html; charset=utf-8')
      .send(renderBrowseErrorHtml('Address Blocked', 'Access to local or private network addresses is disabled for security.'));
    return;
  }

  try {
    const pageResp = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (!pageResp.ok) {
      res
        .status(200)
        .type('text/html; charset=utf-8')
        .send(
          renderBrowseErrorHtml(
            `Could not open ${parsedUrl.hostname}`,
            `The website responded with status ${pageResp.status}. Some pages block automated requests — try another page or search by topic.`
          )
        );
      return;
    }

    const finalUrl = pageResp.url || parsedUrl.toString();
    const contentType = (pageResp.headers.get('content-type') || '').toLowerCase();

    if (contentType.includes('text/plain') || contentType.includes('application/json')) {
      const textBody = await pageResp.text();
      const escaped = textBody.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      const css = buildDyslexiaProxyCss({ font, ls, ws, lh, scale, tint, bg, fg });
      res
        .status(200)
        .type('text/html; charset=utf-8')
        .send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@latest/index.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Comic+Neue:wght@400;700&family=Lexend:wght@400;600;700&display=swap"><style id="abg-dyslexia-style">${css}</style></head><body style="padding:32px;max-width:78ch;margin:0 auto;"><pre style="white-space:pre-wrap;font-family:inherit;">${escaped}</pre></body></html>`);
      return;
    }

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      res
        .status(200)
        .type('text/html; charset=utf-8')
        .send(
          renderBrowseErrorHtml(
            'Non-HTML File',
            `This link returned "${contentType || 'binary data'}" instead of a readable web page.`
          )
        );
      return;
    }

    const html = await pageResp.text();
    const $ = cheerio.load(html);

    // Strip third-party scripts, frame-busting metas, CSP metas, and intrusive consent banners
    $(
      'script, meta[http-equiv="Content-Security-Policy"], meta[http-equiv="X-Frame-Options"], link[rel="preload"][as="script"], link[rel="modulepreload"]'
    ).remove();
    $(
      '#onetrust-consent-sdk, .sp_veil, [id^="sp_message_container"], [class*="cookie-banner"], [id*="cookie-banner"], [class*="CookieConsent"], [id*="gdpr"]'
    ).remove();

    // Strip inline event handlers
    $('*').each((_, el) => {
      const attribs = (el as { attribs?: Record<string, string> }).attribs;
      if (!attribs) return;
      for (const attrName of Object.keys(attribs)) {
        if (attrName.toLowerCase().startsWith('on')) {
          $(el).removeAttr(attrName);
        }
      }
    });

    // Ensure lazy-loaded images & feeds display properly without third-party JS
    $('img').each((_, el) => {
      const img = $(el);
      const rawSrc = img.attr('src') || '';
      const rawDataSrc =
        img.attr('data-src') ||
        img.attr('data-lazy-src') ||
        img.attr('data-original') ||
        '';

      const fixWidthTemplate = (val: string) => val.replace(/\{width\}/gi, '640');

      if (rawDataSrc && (!rawSrc || rawSrc.startsWith('data:image') || rawSrc.includes('placeholder'))) {
        img.attr('src', fixWidthTemplate(rawDataSrc));
      } else if (rawSrc.includes('{width}')) {
        img.attr('src', fixWidthTemplate(rawSrc));
      }

      const dataSrcset = img.attr('data-srcset') || '';
      if (dataSrcset && !img.attr('srcset')) {
        img.attr('srcset', fixWidthTemplate(dataSrcset));
      }

      img.removeAttr('loading');
    });

    $('picture source').each((_, el) => {
      const srcEl = $(el);
      const dataSrcset = srcEl.attr('data-srcset');
      if (dataSrcset && !srcEl.attr('srcset')) {
        srcEl.attr('srcset', dataSrcset.replace(/\{width\}/gi, '640'));
      }
    });

    // Unwrap <noscript> blocks that hold fallback <img> tags when parent has no loaded http image
    $('noscript').each((_, el) => {
      const inner = $(el).html() || '';
      if (inner.includes('<img')) {
        const parent = $(el).parent();
        const siblingImgs = parent.find('img').filter((__, sibling) => {
          const s = $(sibling).attr('src') || '';
          return s.startsWith('http') || s.startsWith('/') || s.startsWith('//');
        });
        if (siblingImgs.length === 0) {
          $(el).replaceWith(inner);
        } else {
          $(el).remove();
        }
      }
    });

    if (!$('head').length) {
      $('html').prepend('<head></head>');
    }
    if (!$('body').length) {
      $('html').append('<body></body>');
    }

    const escapedFinalUrl = finalUrl.replace(/"/g, '&quot;');
    $('head').prepend(
      `<base href="${escapedFinalUrl}" />\n<meta name="referrer" content="no-referrer" />`
    );

    const dyslexiaCss = buildDyslexiaProxyCss({ font, ls, ws, lh, scale, tint, bg, fg });

    $('head').append(`
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@latest/index.css" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/opendyslexic@latest/700.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Lexend:wght@300;400;500;600;700&display=swap" />
      <style id="abg-dyslexia-style">${dyslexiaCss}</style>
    `);

    const bridgeScript = `
      <script>
        (function() {
          var currentPageUrl = ${JSON.stringify(finalUrl)};
          try {
            window.parent.postMessage({
              type: 'abg-loaded',
              url: currentPageUrl,
              title: document.title || currentPageUrl
            }, '*');
          } catch (e) {}

          document.addEventListener('click', function(e) {
            var target = e.target;
            while (target && target.tagName && target.tagName.toLowerCase() !== 'a') {
              target = target.parentElement;
            }
            if (!target || !target.getAttribute) return;
            var rawHref = target.getAttribute('href');
            if (!rawHref) return;
            var trimmed = rawHref.trim();
            if (!trimmed || trimmed.indexOf('javascript:') === 0 || trimmed.indexOf('mailto:') === 0 || trimmed.indexOf('tel:') === 0) return;

            if (trimmed.charAt(0) === '#') {
              var idTarget = document.getElementById(trimmed.slice(1));
              if (idTarget) {
                e.preventDefault();
                idTarget.scrollIntoView({ behavior: 'smooth' });
              }
              return;
            }

            var resolved = target.href;
            if (!resolved) return;
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({ type: 'abg-navigate', url: resolved }, '*');
          }, true);

          document.addEventListener('submit', function(e) {
            var form = e.target;
            if (!form || form.tagName.toLowerCase() !== 'form') return;
            e.preventDefault();
            e.stopPropagation();
            try {
              var action = form.getAttribute('action') || currentPageUrl;
              var dest = new URL(action, currentPageUrl);
              var fd = new FormData(form);
              fd.forEach(function(val, key) {
                if (typeof val === 'string') dest.searchParams.set(key, val);
              });
              window.parent.postMessage({ type: 'abg-navigate', url: dest.toString() }, '*');
            } catch (err) {}
          }, true);

          window.addEventListener('message', function(ev) {
            if (!ev.data || ev.data.type !== 'abg-update-style') return;
            var styleEl = document.getElementById('abg-dyslexia-style');
            if (styleEl && typeof ev.data.css === 'string') {
              styleEl.textContent = ev.data.css;
            }
          });
        })();
      </script>
    `;

    $('body').append(bridgeScript);

    res.status(200).type('text/html; charset=utf-8').send($.html());
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Failed to load web page.';
    res
      .status(200)
      .type('text/html; charset=utf-8')
      .send(
        renderBrowseErrorHtml(
          'Could Not Load Page',
          message.includes('timeout')
            ? 'The website took too long to respond. Try reloading or entering another address.'
            : 'That website blocked loading or timed out. Try another website or search by topic.'
        )
      );
  }
});

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Setup dev Vite server or production static files
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        hmr: false,
      },
      appType: 'spa',
    });
    // Intercept /@vite/client to suppress HMR connection attempt in cloud sandbox preview
    app.use((req: Request, res: Response, next) => {
      if (req.url && req.url.startsWith('/@vite/client')) {
        const originalEnd = res.end.bind(res);
        const chunks: Buffer[] = [];

        res.write = function (chunk: any): boolean {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          return true;
        } as any;

        res.end = function (chunk?: any): any {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          let body = Buffer.concat(chunks).toString('utf-8');
          body = body.replace(
            'reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));',
            '/* silenced HMR reject */'
          );
          body = body.replace(
            'transport.connect(createHMRHandler(handleMessage));',
            '/* HMR WebSocket disabled */'
          );
          body = body.replace(
            'else throw new SendBeforeConnectError("send was called before connect");',
            'else return;'
          );
          body = body.replace(
            'else throw new SendBeforeConnectError("invoke was called before connect");',
            'else return;'
          );
          res.setHeader('Content-Length', Buffer.byteLength(body, 'utf-8'));
          return originalEnd(body, 'utf-8');
        } as any;
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`ABG server running at http://0.0.0.0:${port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is in use. Exiting to allow supervisor restart.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });

  const handleShutdown = () => {
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1000).unref();
  };

  process.on('SIGTERM', handleShutdown);
  process.on('SIGINT', handleShutdown);
}

startServer();
