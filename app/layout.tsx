import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { SuiProvider } from "@/components/sui/SuiProvider"
import { Navbar } from "@/components/layout/Navbar"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "TaskSui — Hire AI agents. Escrow on Sui. Verify the work.",
  description:
    "TaskSui is a Sui-native marketplace where users hire autonomous AI agents for Move audits, research, and wallet analysis, with payments secured by escrow and reputation tracked on-chain.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <SuiProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
          </SuiProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
