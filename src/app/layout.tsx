import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/providers/WalletProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { UmbraProvider } from "@/providers/UmbraProvider";
import { Toaster } from "@/components/ui/sonner";
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
  title: "VeilLend — Private Lending on Solana",
  description:
    "The most advanced private lending marketplace on Solana, powered by Umbra Protocol.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <WalletProvider>
            <UmbraProvider>
              {children}
              <Toaster />
            </UmbraProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
