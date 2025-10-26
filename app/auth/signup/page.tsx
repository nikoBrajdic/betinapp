"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signInWithGoogle, verifyInviteCode } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCodeParam = searchParams.get("code")

  const [inviteCode, setInviteCode] = useState(inviteCodeParam || "")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [error, setError] = useState("")

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      setError("Please enter an invite code")
      return
    }

    setIsVerifying(true)
    setError("")

    const result = await verifyInviteCode(inviteCode.trim().toUpperCase())

    setIsVerifying(false)

    if (result.valid) {
      setIsVerified(true)
      // Store invite code in session storage for use after OAuth
      sessionStorage.setItem("invite_code", inviteCode.trim().toUpperCase())
    } else {
      setError(result.error || "Invalid invite code")
    }
  }

  const handleGoogleSignIn = async () => {
    // Ensure invite code is stored before OAuth redirect
    if (inviteCode.trim()) {
      sessionStorage.setItem("invite_code", inviteCode.trim().toUpperCase())
    }
    await signInWithGoogle()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Join Household Admin</CardTitle>
          <CardDescription>Enter your invite code to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isVerified ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="text-center text-lg font-mono tracking-wider"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button onClick={handleVerifyCode} disabled={isVerifying} className="w-full" size="lg">
                {isVerifying ? "Verifying..." : "Verify Code"}
              </Button>
            </>
          ) : (
            <>
              <Alert className="border-teal-500 bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-100">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Invite code verified! Continue with Google to create your account.</AlertDescription>
              </Alert>

              <form action={handleGoogleSignIn}>
                <Button type="submit" className="w-full" size="lg">
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>

              <Button variant="ghost" onClick={() => setIsVerified(false)} className="w-full">
                Use Different Code
              </Button>
            </>
          )}

          <div className="text-center">
            <Button variant="link" onClick={() => router.push("/auth/login")} className="text-sm">
              Already have an account? Sign in
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
