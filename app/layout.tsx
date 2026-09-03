import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '命笺｜四柱八字历法排盘',
  description: '公农历转换、四柱八字、藏干十神、大运流年。明确时制与流派规则，可核对的传统历法排盘。',
  openGraph: { title: '命笺｜东方灵感与今日启示', description: '问当下，也问内心。生成一份属于你的东方灵感命笺。', images: [{ url: '/og.png', width: 1731, height: 909, alt: '命笺｜问当下，也问内心' }] },
  twitter: { card: 'summary_large_image', title: '命笺｜东方灵感与今日启示', description: '问当下，也问内心。生成一份属于你的东方灵感命笺。', images: ['/og.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
