import type { Metadata } from "next";
import { Nunito, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";

// Font Nunito có góc bo tròn thân thiện, hiện đại giống Quicksand nhưng hỗ trợ 100% tiếng Việt chuẩn Unicode, không bị lỗi bể dấu
const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
  preload: true,
});

// Font Be Vietnam Pro được thiết kế riêng biệt 100% cho tiếng Việt
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "HoNa Fresh - Sàn Nông Sản B2B Từ Nông Trại Đến Bàn Ăn",
  description: "HoNa Fresh - Sàn giao dịch sỉ nông sản kết nối trực tiếp trang trại và thương lái, nông sản hữu cơ, chuẩn VietGAP tươi ngon mỗi ngày.",
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
        <meta name="referrer" content="no-referrer" />
        <link rel="icon" href="/assets/logo/logo_rutGon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/assets/logo/logo_rutGon.png" />
      </head>
      <body className={`${beVietnamPro.variable} ${nunito.variable} antialiased font-body bg-[#F9F9F5] text-[#2C3E2E]`}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
