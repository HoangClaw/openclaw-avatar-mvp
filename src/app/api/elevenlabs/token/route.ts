import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-elevenlabs-api-key');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing x-elevenlabs-api-key header' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe',
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey },
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      return NextResponse.json(
        { error: `ElevenLabs token error (${res.status}): ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('ElevenLabs token route error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Token generation failed' },
      { status: 502 }
    );
  }
}
