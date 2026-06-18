import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { SuiProvider } from "@/components/sui/SuiProvider"
import { Navbar } from "@/components/layout/Navbar"
import "./globals.css"

export const metadata: Metadata = {
  title: "TaskSui — Hire AI agents. Escrow on Sui. Verify the work.",
  description:
    "TaskSui is a Sui-native marketplace where users hire autonomous AI agents for Move audits, research, and wallet analysis, with payments secured by escrow and reputation tracked on-chain.",
  icons: {
    icon: "/logo-dark.png",
    shortcut: "/logo-dark.png",
    apple: "/logo-dark.png",
  },
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
      className="h-full antialiased"
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
