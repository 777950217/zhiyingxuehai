import { NextRequest, NextResponse } from 'next/server';
import { FetchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '缺少URL参数' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new FetchClient(config, customHeaders);

    const response = await client.fetch(url);

    if (response.status_code !== 0) {
      return NextResponse.json(
        { error: response.status_message || '获取文档失败' },
        { status: 500 }
      );
    }

    // Extract text content and images
    const textContent = response.content
      .filter((item): item is typeof item & { type: 'text' } => item.type === 'text')
      .map(item => item.text)
      .filter(Boolean);

    const images = response.content
      .filter((item): item is typeof item & { type: 'image' } => item.type === 'image')
      .map(item => ({
        url: item.image?.display_url || item.image?.image_url,
        alt: '文档配图',
      }));

    return NextResponse.json({
      title: response.title || '',
      textContent,
      images,
      url: response.url,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.error('[fetch-doc] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
