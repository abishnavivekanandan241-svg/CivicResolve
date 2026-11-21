import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function testFastModel() {
  const key = process.env.GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey: key });

  const candidates = [
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-3.8-flash',
  ];

  for (const m of candidates) {
    try {
      console.log(`Testing model: ${m}...`);
      const res = await ai.models.generateContent({
        model: m,
        contents: 'Hi! Reply with "OK: " and the model name.',
      });
      console.log(`✓ ${m} WORKED! Response:`, res.text?.trim());
      return m;
    } catch (e: any) {
      console.log(`✘ ${m} error:`, e?.status || e?.message);
    }
  }
}

testFastModel();
