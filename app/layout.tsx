import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Sống Sót Đến Cuối Tháng",
    description:
      "Mini game quản lý tài chính: 30 ngày, mỗi lựa chọn đều có giá.",
    openGraph: {
      title: "Sống Sót Đến Cuối Tháng",
      description: "30 ngày · Mỗi lựa chọn đều có giá",
      type: "website",
      locale: "vi_VN",
      images: [
        {
          url: `${origin}/og.png`,
          width: 1733,
          height: 909,
          alt: "Sống Sót Đến Cuối Tháng",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Sống Sót Đến Cuối Tháng",
      description: "30 ngày · Mỗi lựa chọn đều có giá",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
