import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "CirculSense AI — Sistem Fusi Sensor Gas & Visual Upcycling Pangan",
  description: "Sistem fusi sensor gas biokimia (MQ-4 & MQ-135) dan visi AI untuk deteksi degradasi bahan pangan serta rekomendasi upcycling otomatis.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} antialiased`}>
      <body className="min-h-screen bg-[#F7FAF8] text-[#1E293B] font-sans selection:bg-[#16A34A] selection:text-white">
        {children}
      </body>
    </html>
  );
}
