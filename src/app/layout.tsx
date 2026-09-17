import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DompetKu — Catatan Pemasukan & Pengeluaran",
  description:
    "Aplikasi pengelola keuangan pribadi: catat pemasukan & pengeluaran, pantau arus kas, dan analisis pengeluaran dengan grafik yang mudah dipahami.",
  keywords: [
    "keuangan",
    "pemasukan",
    "pengeluaran",
    "budget",
    "dompet",
    "catatan keuangan",
    "money manager",
  ],
  authors: [{ name: "DompetKu" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "DompetKu — Catatan Pemasukan & Pengeluaran",
    description:
      "Aplikasi pengelola keuangan pribadi yang lengkap dan mudah digunakan.",
    siteName: "DompetKu",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DompetKu — Catatan Pemasukan & Pengeluaran",
    description:
      "Aplikasi pengelola keuangan pribadi yang lengkap dan mudah digunakan.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
            <SonnerToaster richColors position="top-center" />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
