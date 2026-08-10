import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/lib/seo';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Stocklytics — free Adobe Stock keyword, prompt and analytics tools';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b0f1a 0%, #111827 55%, #064e3b 100%)',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 30, color: '#6ee7b7', letterSpacing: 2, textTransform: 'uppercase' }}>
          {SITE_NAME}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 68,
            fontWeight: 700,
            lineHeight: 1.15,
            marginTop: 24,
          }}
        >
          <div>Free Adobe Stock</div>
          <div>keyword &amp; prompt tools</div>
        </div>
        <div style={{ fontSize: 30, color: 'rgba(255,255,255,0.72)', marginTop: 32 }}>
          Prompt generator · Keyword research · Trends · Portfolio analytics
        </div>
      </div>
    ),
    size,
  );
}
