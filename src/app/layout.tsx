import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { brand } from "@/config/brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: brand.productName,
    template: `%s · ${brand.productName}`,
  },
  description: brand.tagline,
  icons: {
    icon: brand.logo.mark,
    apple: brand.logo.mark,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className={`${geistSans.className} antialiased`}>{children}</body>
    </html>
  );
}
