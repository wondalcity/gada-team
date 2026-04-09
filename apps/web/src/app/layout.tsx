import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

export const metadata: Metadata = {
  title: {
    default: "GADA 가다 — 건설 현장 구인구직",
    template: "%s | GADA 가다",
  },
  description:
    "건설 현장 전문 구인구직 플랫폼. 근로자, 팀, 기업이 함께하는 GADA.",
  keywords: [
    "건설",
    "구인구직",
    "현장직",
    "건설 일자리",
    "GADA",
    "가다",
    "콘크리트",
    "철근",
    "전기공",
    "배관공",
  ],
  authors: [{ name: "GADA Inc." }],
  creator: "GADA Inc.",
  openGraph: {
    title: "GADA 가다 — 건설 현장 구인구직",
    description: "건설 현장 전문 구인구직 플랫폼",
    type: "website",
    locale: "ko_KR",
    siteName: "GADA",
  },
  twitter: {
    card: "summary_large_image",
    title: "GADA 가다",
    description: "건설 현장 전문 구인구직 플랫폼",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0669F7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
