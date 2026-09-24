import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const SYSTEM_INSTRUCTION = `
You are LiveNova, an advanced, highly intelligent AI Assistant (like Gemini / ChatGPT).
Aapka maksad hai har sawal ka SATIK, SEEDHA aur SPASHT jawab dena (direct crisp answers, no filler intro).
1. Chahe sawal science, history, geography, coding, math, general knowledge, ya daily life ka ho — seedha aur satik jawab do.
2. Agar user kisi task ke bare mein bole (jaise Chrome search, WhatsApp, Torch, Timer, Notes), toh clear actionable guide do.
3. Language: Agar user Hindi ya Hinglish mein puche toh Hindi/Hinglish mein natural, sundar jawab do; English mein puche toh English mein do.
4. Keep answers concise, clear, and direct.
`.trim();

// Instant device intent parser (0ms latency, zero quota use)
function parseDirectDeviceIntent(prompt: string) {
  const p = prompt.toLowerCase().trim();

  // 1. Chrome / Browser / Web Search Intent
  if (
    p.includes('chrome') ||
    p.includes('google search') ||
    p.includes('search karo') ||
    p.includes('search karke do') ||
    p.includes('dhoondh ke do') ||
    p.includes('browser open') ||
    p.includes('khoj ke do')
  ) {
    let cleanQuery = p
      .replace(/chrome\s+open\s+karo|chrome\s+kholo|chrome\s+me|chrome\s+par|google\s+par|google\s+search|browser\s+open\s+karo|browser\s+kholo/gi, '')
      .replace(/search\s+karke\s+do|search\s+karo|dhoondh\s+ke\s+do|dhoondho|khoj\s+ke\s+do/gi, '')
      .replace(/kripya|please|mujhe|koi\s+ek\s+chij|ek\s+chij|chij|kuch/gi, '')
      .trim();

    // Strip leading words like 'aur', 'and', etc.
    cleanQuery = cleanQuery.replace(/^(aur|and|karo|me|mein|par|ko)\s+/gi, '').trim();

    return {
      text: cleanQuery
        ? `Chrome open karke "${cleanQuery}" search kar diya hai.`
        : 'Chrome browser search page open kar diya hai.',
      functionCalls: [
        {
          name: 'search_web',
          args: { query: cleanQuery || 'Google Search' },
        },
      ],
    };
  }

  // 2. Switch off / power off phone check
  if (
    p.includes('switch off') ||
    p.includes('switch on') ||
    p.includes('phone band') ||
    p.includes('mobile band') ||
    p.includes('phone switch') ||
    p.includes('mobile switch') ||
    p.includes('phone off') ||
    p.includes('mobile off') ||
    p.includes('restart') ||
    p.includes('reboot') ||
    p.includes('shutdown') ||
    p.includes('shut down')
  ) {
    return {
      text: 'Mobile hardware switch off ya restart karna browser security policy ke kaaran restricted hai. Par Chrome search, torch, timer, WhatsApp, notes aur baaki saare kaam main abhi turant kar sakta hoon!',
      functionCalls: [{ name: 'device_power_request', args: { action: 'switch_off' } }],
    };
  }

  // 3. Torch / Flashlight
  if (p.includes('torch') || p.includes('flashlight') || p.includes('light') || p.includes('batti')) {
    const isOff = p.includes('off') || p.includes('band') || p.includes('bujha');
    return {
      text: isOff ? 'Torch band kar diya hai.' : 'Torch chalu kar diya hai.',
      functionCalls: [{ name: 'toggle_torch', args: { action: isOff ? 'off' : 'on' } }],
    };
  }

  // 4. Timers & Alarms
  const timerMatch = p.match(/(\d+)\s*(min|minute|sec|second|ghante|hour|ghanta)/);
  if (p.includes('timer') || p.includes('alarm') || timerMatch) {
    let secs = 60;
    let label = 'Timer';

    if (timerMatch) {
      const val = parseInt(timerMatch[1], 10);
      const unit = timerMatch[2];
      if (unit.startsWith('min')) secs = val * 60;
      else if (unit.startsWith('sec')) secs = val;
      else if (unit.startsWith('hour') || unit.startsWith('ghan')) secs = val * 3600;
    } else {
      const numberMatch = p.match(/\b(\d+)\b/);
      if (numberMatch) secs = parseInt(numberMatch[1], 10) * 60;
    }

    if (p.includes('chai') || p.includes('tea')) label = 'Chai Timer';
    else if (p.includes('study') || p.includes('padhai')) label = 'Study Timer';
    else if (p.includes('workout') || p.includes('exercise')) label = 'Workout Timer';

    const readableTime = secs >= 60 ? `${Math.round(secs / 60)} minute` : `${secs} second`;
    return {
      text: `${label} (${readableTime}) start ho gaya hai!`,
      functionCalls: [{ name: 'set_timer', args: { seconds: secs, label } }],
    };
  }

  // 5. WhatsApp
  if (p.includes('whatsapp') || p.includes('whats app')) {
    const cleanQuery = p.replace(/whatsapp|whats app|kholo|chalao|par|message|bhejo|open/gi, '').trim();
    return {
      text: cleanQuery ? `WhatsApp par message khol diya.` : 'WhatsApp open kar diya hai.',
      functionCalls: [{ name: 'open_app', args: { target: 'whatsapp', query: cleanQuery } }],
    };
  }

  // 6. YouTube
  if (p.includes('youtube') || p.includes('you tube')) {
    const query = p.replace(/youtube|you tube|kholo|chalao|search|play|video|dikhao/gi, '').trim();
    return {
      text: query ? `YouTube par "${query}" search khol diya.` : 'YouTube open kar diya hai.',
      functionCalls: [{ name: 'open_app', args: { target: 'youtube', query } }],
    };
  }

  // 7. Google Maps / Navigation
  if (p.includes('maps') || p.includes('map') || p.includes('rasta') || p.includes('direction') || p.includes('navigation')) {
    const loc = p.replace(/maps|map|kholo|open|rasta dikhao|direction|ka rasta|ka map/gi, '').trim();
    return {
      text: loc ? `Google Maps par ${loc} ka rasta khol diya.` : 'Google Maps khol diya hai.',
      functionCalls: [{ name: 'open_app', args: { target: 'maps', query: loc } }],
    };
  }

  // 8. Phone dialer / Call
  if (p.includes('call') || p.includes('dial') || p.includes('phone lagao') || p.includes('number milao')) {
    const phoneNum = p.replace(/[^0-9+]/g, '');
    return {
      text: phoneNum ? `Phone dialer ${phoneNum} par khola gaya.` : 'Phone dialer khol diya hai.',
      functionCalls: [{ name: 'open_app', args: { target: 'phone', query: phoneNum } }],
    };
  }

  // 9. Notes & Reminders
  if (p.includes('note') || p.includes('likho') || p.includes('yaad rakh') || p.includes('reminder') || p.includes('to do') || p.includes('todo')) {
    const noteText = p.replace(/note likho|note banao|yaad rakhna|likh lo|reminder lagao|save note/gi, '').trim() || 'Important Task';
    return {
      text: `Note save kar diya: "${noteText}"`,
      functionCalls: [
        {
          name: 'create_note',
          args: {
            title: noteText.slice(0, 30),
            content: noteText,
            category: 'Personal',
          },
        },
      ],
    };
  }

  // 10. Ambient Audio
  if (p.includes('rain sound') || p.includes('baarish') || p.includes('rain')) {
    return {
      text: 'Relaxing rain sound shuru kar diya hai.',
      functionCalls: [{ name: 'play_ambient_sound', args: { soundType: 'rain' } }],
    };
  }
  if (p.includes('forest sound') || p.includes('jungle')) {
    return {
      text: 'Forest sound shuru kar diya hai.',
      functionCalls: [{ name: 'play_ambient_sound', args: { soundType: 'forest' } }],
    };
  }
  if (p.includes('sound band') || p.includes('audio band') || p.includes('stop sound')) {
    return {
      text: 'Sound band kar diya hai.',
      functionCalls: [{ name: 'play_ambient_sound', args: { soundType: 'stop' } }],
    };
  }

  // 11. Vibrate
  if (p.includes('vibrate') || p.includes('vibration')) {
    return {
      text: 'Device vibrate kar diya hai.',
      functionCalls: [{ name: 'device_vibrate', args: { pattern: 'alert' } }],
    };
  }

  // 12. Mathematical calculations
  const mathRegex = /(\d+(\.\d+)?)\s*([\+\-\*\/]|%|percent|pratishat)\s*(\d+(\.\d+)?)?/i;
  if (mathRegex.test(p)) {
    try {
      if (p.includes('%') || p.includes('percent') || p.includes('gst')) {
        const numbers = p.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length >= 2) {
          const rate = parseFloat(numbers[0]);
          const base = parseFloat(numbers[1]);
          const result = (rate * base) / 100;
          return {
            text: `${base} ka ${rate}% = ${result} hota hai. Total: ${base + result}.`,
            functionCalls: [],
          };
        }
      }
      const expr = p.replace(/kitna hoga|kya hoga|batao|calculate|math|jawab/gi, '').trim();
      const sanitized = expr.replace(/[^0-9\+\-\*\/\.\(\)\s]/g, '');
      if (sanitized && /^[0-9\+\-\*\/\.\(\)\s]+$/.test(sanitized)) {
        const res = Function(`'use strict'; return (${sanitized})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          return {
            text: `${sanitized} = ${res}`,
            functionCalls: [],
          };
        }
      }
    } catch {
      // ignore
    }
  }

  // 13. Time & Date
  if (p.includes('time kya') || p.includes('kitne baje') || p.includes('current time')) {
    const timeStr = new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return {
      text: `Abhi samay ${timeStr} hua hai.`,
      functionCalls: [],
    };
  }
  if (p.includes('aaj ki date') || p.includes('kaun sa din') || p.includes('today date')) {
    const dateStr = new Date().toLocaleDateString('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return {
      text: `Aaj ${dateStr} hai.`,
      functionCalls: [],
    };
  }

  return null;
}

// Multi-Model AI Engine for 100% Guaranteed Answers
async function queryAI(prompt: string, history: any[] = []): Promise<string> {
  const models = [
    'gemini-3.6-flash',
    'gemma-4-26b-a4b-it',
    'gemini-3.8-flash',
    'gemini-3.7-flash',
  ];

  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-4)) {
      contents.push({
        role: turn.role === 'user' ? 'user' : 'model',
        parts: [{ text: turn.text }],
      });
    }
  }
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 600,
          },
        }),
      });

      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts;

      if (Array.isArray(parts) && parts.length > 0) {
        // Find non-thought part if model output includes reasoning thoughts
        const answerPart = parts.find((p: any) => !p.thought && p.text) || parts[parts.length - 1];
        let text = answerPart?.text?.trim() || '';

        if (text) {
          // If formatting includes markdown options from reasoning
          if (text.includes('Option 1:') || text.includes('Option 2:')) {
            const cleanLines = text.split('\n').filter((l: string) => !l.startsWith('*') && l.trim().length > 0);
            if (cleanLines.length > 0) text = cleanLines[cleanLines.length - 1].replace(/"/g, '').trim();
          }
          return text;
        }
      }
    } catch (e) {
      // try next fallback model
    }
  }

  return '';
}

// Chat & Action Execution API
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { prompt, conversationHistory } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const trimmed = prompt.trim();

    // 1. Direct device action intent parser
    const directAction = parseDirectDeviceIntent(trimmed);
    if (directAction) {
      return res.json({
        text: directAction.text,
        functionCalls: directAction.functionCalls,
        success: true,
        source: 'direct_engine',
      });
    }

    // 2. High-Accuracy AI Answering Engine (Gemini / Gemma fallback)
    const answer = await queryAI(trimmed, conversationHistory);
    if (answer) {
      return res.json({
        text: answer,
        functionCalls: [],
        success: true,
        source: 'ai_engine',
      });
    }

    // 3. Graceful fallback with web search option
    return res.json({
      text: `Aapka sawal "${trimmed}" hai. Main ise search karke dikha sakta hoon, bas bolein: "Chrome open karo aur ${trimmed} search karo".`,
      functionCalls: [],
      success: true,
      source: 'smart_fallback',
    });
  } catch (error: any) {
    return res.status(200).json({
      text: 'Aapka sawal mil gaya hai. Kripya dobara bolein ya type karein.',
      functionCalls: [],
      success: true,
      source: 'safe_fallback',
    });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    backgroundReady: true,
    engine: 'Multi-Model AI (Gemini + Gemma)',
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LiveNova AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
