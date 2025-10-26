import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { getCurrentUser } from "@/lib/actions/auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Household Admin",
  description: "Shared household management dashboard",
    generator: 'v0.app'
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {user ? (
          <div className="flex h-screen overflow-hidden">
            <Sidebar user={user} />
            <main className="flex-1 overflow-y-auto bg-background">{children}</main>
          </div>
        ) : (
          <main className="min-h-screen bg-background">{children}</main>
        )}
      </body>
    </html>
  )
}
