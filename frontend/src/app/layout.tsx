import type { Metadata } from "next";
import { Quicksand, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HoNa Fresh - Rau Sạch Từ Nông Trại Đến Bàn Ăn",
  description: "HoNa Fresh - Cửa hàng rau củ quả hữu cơ, chuẩn VietGAP tươi ngon mỗi ngày. Thu hoạch trực tiếp từ nông trại Đà Lạt & Mộc Châu, giao nhanh 2 giờ.",
  icons: {
    icon: "/assets/logo/logo_rutGon.png",
    shortcut: "/assets/logo/logo_rutGon.png",
    apple: "/assets/logo/logo_rutGon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <link rel="icon" href="/assets/logo/logo_rutGon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo/logo_rutGon.png" />
      </head>
      <body className={`${beVietnamPro.variable} ${quicksand.variable} antialiased font-body bg-[#F9F9F5] text-[#2C3E2E]`}>
        {children}
      </body>
    </html>
  );
}

