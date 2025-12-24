import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Giọt Dầu Vàng - PVOIL VŨNG ÁNG",
  description: "Giọt Dầu Vàng - PVOIL VŨNG ÁNG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}

