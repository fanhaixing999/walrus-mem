import './globals.css';

export const metadata = {
  title: 'World Cup Walrus Memory Agent',
  description: 'Persistent Memory AI Agent on Walrus Mainnet',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
