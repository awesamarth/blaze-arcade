import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider"
import { headers } from 'next/headers'
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import ContextProvider from "@/context";
import { useAppKitTheme } from "@reown/appkit/react";
import { useTheme } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  weight: '400',
  variable: '--font-doom',
  subsets: ['latin'],
});



export const metadata: Metadata = {
  title: "Samarth Saxena | Portfolio",
  description: "Portfolio showcasing my dev work and content",
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers()
  const cookies = headersList.get('cookie')

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ContextProvider cookies={cookies}>


            <Navbar />
            {children}
            <Footer />
          </ContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
