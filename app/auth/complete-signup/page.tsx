"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useInviteCode, getCurrentUser } from "@/lib/actions/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function CompleteSignupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [message, setMessage] = useState("Completing your signup...")
  const inviteCode = sessionStorage.getItem("invite_code")

  useEffect(() => {
    const completeSignup = async () => {
      try {
        if (!inviteCode) {
          setStatus("error")
          setMessage("No invite code found. Please try signing up again.")
          setTimeout(() => router.push("/auth/signup"), 3000)
          return
        }

        const user = await getCurrentUser()

        if (!user) {
          setStatus("error")
          setMessage("Authentication failed. Please try again.")
          setTimeout(() => router.push("/auth/login"), 3000)
          return
        }

        const result = await useInviteCode(inviteCode, user.id)

        if (result.success) {
          setStatus("success")
          setMessage("Account created successfully! Redirecting...")
          sessionStorage.removeItem("invite_code")
          setTimeout(() => router.push("/"), 2000)
        } else {
          setStatus("error")
          setMessage(result.error || "Failed to complete signup")
          setTimeout(() => router.push("/auth/signup"), 3000)
        }
      } catch (error) {
        setStatus("error")
        setMessage("An unexpected error occurred")
        setTimeout(() => router.push("/auth/signup"), 3000)
      }
    }

    completeSignup()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {status === "processing" && "Setting up your account..."}
            {status === "success" && "Welcome!"}
            {status === "error" && "Oops!"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          {status === "processing" && <Loader2 className="h-8 w-8 animate-spin text-teal-500" />}
          {status === "success" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-950">
              <svg
                className="h-8 w-8 text-teal-600 dark:text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {status === "error" && (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <svg
                className="h-8 w-8 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
