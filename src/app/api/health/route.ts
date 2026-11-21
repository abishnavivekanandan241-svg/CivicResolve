import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAiClient, getModelName } from '@/lib/gemini';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = { connected: false, latencyMs: 0, error: undefined as string | undefined };
  let geminiStatus = {
    connected: false,
    latencyMs: 0,
    model: getModelName(),
    error: undefined as string | undefined,
  };

  // 1. Check Database (Turso / SQLite)
  const dbStart = Date.now();
  try {
    const deptCount = await prisma.department.count();
    dbStatus = {
      connected: true,
      latencyMs: Date.now() - dbStart,
      error: undefined,
    };
  } catch (err: any) {
    dbStatus = {
      connected: false,
      latencyMs: Date.now() - dbStart,
      error: err.message || 'Database connection error',
    };
  }

  // 2. Check Gemini AI
  const geminiStart = Date.now();
  const ai = getAiClient();
  if (ai) {
    try {
      const ping = await ai.models.generateContent({
        model: getModelName(),
        contents: 'Respond with exactly: OK',
      });
      geminiStatus = {
        connected: Boolean(ping.text),
        latencyMs: Date.now() - geminiStart,
        model: getModelName(),
        error: undefined,
      };
    } catch (err: any) {
      geminiStatus = {
        connected: false,
        latencyMs: Date.now() - geminiStart,
        model: getModelName(),
        error: err.message || 'Gemini API call failed',
      };
    }
  } else {
    geminiStatus.error = 'GEMINI_API_KEY is not configured or offline';
  }

  const isHealthy = dbStatus.connected && geminiStatus.connected;
  const status = isHealthy ? 'ok' : dbStatus.connected ? 'degraded' : 'down';

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database: dbStatus,
      gemini: geminiStatus,
      app: {
        name: 'CivicResolve',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        totalLatencyMs: Date.now() - startTime,
      },
    },
    { status: status === 'down' ? 503 : 200 }
  );
}
