import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Trinity Pixels — AI Voice Receptionist for Indian Businesses",
  description: "Never miss another lead. Your 24/7 AI Voice Receptionist, built and managed for you. Setup in 24 hours. Indian businesses, Indian payment methods.",
  keywords: "AI receptionist, voice AI, missed calls, Indian business, automated receptionist, lead generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
