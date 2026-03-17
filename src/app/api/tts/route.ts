import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_BASE = 'https://api.elevenlabs.io';

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get('x-elevenlabs-api-key');
  const apiKey = rawKey?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing x-elevenlabs-api-key header' },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    text,
    voiceId = 'pNInz6obpgDQGcFmaJgB',
    modelId = 'eleven_multilingual_v2',
  } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Missing text' }, { status: 400 });
  }

  const url = `${ELEVENLABS_BASE}/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32&optimize_streaming_latency=2`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'xi-api-key': apiKey,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text: text.trim(), model_id: modelId }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => res.statusText);
      let errJson: any;
      try {
        errJson = JSON.parse(errBody);
      } catch {
        errJson = { raw: errBody };
      }
      console.error('[TTS] ElevenLabs error:', res.status, errJson);
      return NextResponse.json(
        {
          error: `ElevenLabs TTS (${res.status})`,
          status: res.status,
          detail: errJson,
        },
        { status: res.status }
      );
    }

    return new NextResponse(res.body, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[TTS] Proxy error:', err);
    return NextResponse.json(
      { error: err.message ?? 'TTS request failed' },
      { status: 502 }
    );
  }
}

/** Debug: validate ElevenLabs API key via minimal TTS request (no user_read permission needed) */
export async function GET(request: NextRequest) {
  const rawKey = request.headers.get('x-elevenlabs-api-key');
  const apiKey = rawKey?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing x-elevenlabs-api-key header' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${ELEVENLABS_BASE}/v1/text-to-speech/pNInz6obpgDQGcFmaJgB/stream?output_format=mp3_22050_32`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({ text: 'OK', model_id: 'eleven_multilingual_v2' }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, ...data },
        { status: res.status }
      );
    }
    return NextResponse.json({ ok: true, message: 'TTS works' });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Request failed' },
      { status: 502 }
    );
  }
}
