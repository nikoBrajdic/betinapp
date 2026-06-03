import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { TopBar } from "@/components/top-bar"
import { EventsPanel } from "@/components/events-panel"
import { getCurrentUser } from "@/lib/actions/auth"
import { getEvents } from "@/lib/actions/events"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Betinapp",
  description: "Shared household management dashboard",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  const events = user ? await getEvents().catch(() => []) : []

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {user ? (
          <div
            className="flex h-screen w-screen overflow-hidden p-4 gap-4"
            style={{ background: "linear-gradient(135deg, #1a1464 0%, #2563eb 100%)" }}
          >
            <Sidebar user={user} />

            {/* Right column */}
            <div className="flex-1 flex flex-col gap-3 min-w-0">
              <TopBar />

              {/* Content row: white inset + optional events panel */}
              <div className="flex-1 flex gap-3 min-h-0">
                {/* White inset container */}
                <div className="flex-1 bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl min-h-0 min-w-0">
                  <main className="flex-1 overflow-y-auto">
                    {children}
                  </main>
                </div>

                {/* Events panel — renders itself only on /calendar */}
                <EventsPanel events={events} />
              </div>
            </div>
          </div>
        ) : (
          <main
            className="min-h-screen"
            style={{ background: "linear-gradient(135deg, #1a1464 0%, #2563eb 100%)" }}
          >
            {children}
          </main>
        )}
      </body>
    </html>
  )
}
