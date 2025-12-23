"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "setting-up" | "error">(
    "loading"
  )
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
  const setupProfile = async () => {
    const supabase = createClient()

    try {
      // 1️⃣ Get session (IMPORTANT: not getUser)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        throw new Error("Not authenticated. Please log in.")
      }

      const user = session.user

      // 🔍 Debug (safe)
      console.log("USER METADATA:", user.user_metadata)
      console.log("ROLE:", user.user_metadata?.role)
      console.log("COMPANY CODE:", user.user_metadata?.company_code)

      // 2️⃣ Check existing profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, role")
        .eq("id", user.id)
        .single()

      if (profile?.company_id) {
        router.push(`/${profile.role}`)
        return
      }

      setStatus("setting-up")

      const metadata = user.user_metadata
      const role = metadata.role

      // 3️⃣ OWNER FLOW – create company
      if (role === "owner") {
        const { error } = await supabase.rpc("create_owner_company", {
          p_company_name: metadata.company_name,
          p_owner_name: metadata.full_name,
          p_owner_email: user.email!,
          p_owner_phone: metadata.owner_phone,
          p_address: metadata.company_address || "",
          p_city: metadata.company_city || "",
          p_state: metadata.company_state || "",
        })

        if (error) {
          throw new Error(`Failed to create company: ${error.message}`)
        }
      }

      // 4️⃣ DISTRIBUTOR FLOW – join company (CRITICAL FIX)
      if (role === "distributor") {
        if (!metadata.company_code) {
          throw new Error("Company code missing. Please re-register.")
        }

        const { error } = await supabase.rpc("join_company", {
          p_company_code: metadata.company_code,
        })

        if (error) {
          throw new Error("Invalid company code or company not found.")
        }
      }

      // 5️⃣ SALESMAN FLOW (role only for now)
      if (role === "salesman") {
        const { error } = await supabase
          .from("profiles")
          .update({ role })
          .eq("id", user.id)

        if (error) {
          throw new Error(`Failed to set role: ${error.message}`)
        }
      }

      // 6️⃣ Redirect to dashboard
      router.push(`/${role}`)
    } catch (error: unknown) {
      console.error("[setup] error:", error)
      setStatus("error")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "An error occurred during setup"
      )
    }
  }

  setupProfile()
}, [router])


  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">
            Setting Up Your Account
          </CardTitle>
          <CardDescription>
            Please wait while we complete your registration...
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" || status === "setting-up" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-sm text-gray-600">
                {status === "loading"
                  ? "Verifying your account..."
                  : "Creating your profile..."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
              <Button
                onClick={() => router.push("/auth/login")}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
