import { signInWithGoogle } from "@/lib/actions/auth"
import { redirect } from "next/navigation"

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  const errorMessage =
    error === "not_authorized"
      ? "Your email isn't on the access list."
      : error === "pending_approval"
      ? "Your request is pending approval."
      : error
      ? `Something went wrong. Please try again.`
      : null

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-sm">

        {/* Card */}
        <div className="w-full rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-8 shadow-2xl flex flex-col items-center gap-6">

          {/* Logo + name */}
          <div className="flex flex-col items-center gap-4">
            <svg viewBox="0 0 1024 1024" className="h-16 w-16" fill="none">
              <path fill="white" d="M766.17,763.71c-30.9-32.32-79.62-30.57-109.28.82l-38.15,40.37c-59.78,63.27-156.43,59.74-216.57-3.1l-39.86-41.64c-27.33-28.55-74.65-27.32-102.16,1.42l-44.26,46.23c-26.55,27.73-60.66,41.7-99.1,43.58-22.14,1.09-39.79-13.54-39.65-36.5l.21-33.11,39.92-.57c15.51-.22,33.3-7.31,44.03-18.42l41.78-43.24c59.71-61.8,154.48-64.34,215.01-2.83l46.57,47.32c25.28,25.68,71.21,24.31,96.27-1.33l43.55-44.55c60.16-61.53,154.54-61.6,214.91,0l44.93,45.85c11.29,11.52,29.65,17.33,45.37,17.42l37.18.2-.37,36.38c-.2,19.68-17.12,33.44-36.13,33.21-38.85-.48-73.99-14.13-100.65-42.02l-43.53-45.52Z"/>
              <path fill="white" d="M604.57,658.01c-53.56,46.38-136.36,45.05-188.4-2.7l-49.53-50.72c-31.28-32.03-79.46-30.58-110.73,1.41l-49.24,50.38c-19.32,19.76-45.02,28.59-71.83,34.42l-57.55.62v-311.99s434.54-206.88,434.54-206.88l434.85,206.82.08,311.96-60.33-1c-24.66-5.97-49.47-14.1-67.54-32.5l-50.83-51.78c-32.22-32.81-80.15-32.74-112.38.02l-51.1,51.94ZM458.22,599.32c29.3,31.04,78.31,31.17,107.05.63l35.07-37.27c31.78-33.77,71.35-52.79,117.35-51.28,42.2,1.38,81.02,21.84,110.07,56.18,15.4,16.43,28.96,32.91,49.39,46.21l-.12-190.29-365.09-173.63-365.21,173.74.11,189.93c15.36-9.72,26.68-20.86,37.52-33.87l34.94-34.59c61.11-51.42,148.65-41.38,202.74,15.93l36.17,38.32Z"/>
            </svg>
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white tracking-tight">Betinapp</h1>
              <p className="text-white/70 text-sm mt-1">Making life at the coast easier, since 2026</p>
            </div>
          </div>

          <div className="w-full h-px bg-white/10" />

          {errorMessage && (
            <div className="mb-4 rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-200">
              {errorMessage}
            </div>
          )}

          <form action={async () => {
            "use server"
            const result = await signInWithGoogle()
            if (result?.error) {
              redirect(`/auth/login?error=${encodeURIComponent(result.error)}`)
            }
          }}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-white/55">
            Only invited members can access Betinapp
          </p>
        </div>

      </div>
    </div>
  )
}
