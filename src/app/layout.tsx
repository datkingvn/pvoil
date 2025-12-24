import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Game Show - Đường lên đỉnh Olympia",
  description: "Trải nghiệm game show thi đấu",
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

