import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const gatewayUrl = request.headers.get('x-gateway-url');
  const token = request.headers.get('x-gateway-token');

  if (!gatewayUrl) {
    return NextResponse.json(
      { error: 'Missing x-gateway-url header' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const responsesUrl = gatewayUrl.replace(/\/$/, '') + '/v1/responses';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-openclaw-agent-id': 'main',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const debugBody = JSON.parse(JSON.stringify(body));
    if (debugBody.input && Array.isArray(debugBody.input)) {
      debugBody.input = debugBody.input.map((item: any) => {
        if (item.content && Array.isArray(item.content)) {
          item.content = item.content.map((c: any) => {
            if (c.source?.data) return { ...c, source: { ...c.source, data: `<base64 ${c.source.data.length} chars>` } };
            return c;
          });
        }
        return item;
      });
    }
    console.log('Request to /v1/responses:', JSON.stringify(debugBody, null, 2));

    const response = await fetch(responsesUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error('Gateway error response:', response.status, errorText);
      return NextResponse.json(
        { error: `Gateway error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Responses API proxy error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Responses proxy failed' },
      { status: 502 }
    );
  }
}
