"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function SetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "setting-up" | "error">("loading")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const setupProfile = async () => {
      const supabase = createClient()

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error("Not authenticated. Please log in.")
        }

        // Check if profile already has company_id (already set up)
        const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single()

        if (profile?.company_id) {
          // Already set up, redirect to their dashboard
          router.push(`/${profile.role}`)
          return
        }

        setStatus("setting-up")

        const metadata = user.user_metadata
        const role = metadata.role

        if (role === "owner") {
          // Create company for owner
          const { data: companyData, error: companyError } = await supabase.rpc("create_owner_company", {
            p_company_name: metadata.company_name,
            p_owner_name: metadata.full_name,
            p_owner_email: user.email!,
            p_owner_phone: metadata.owner_phone,
            p_address: metadata.company_address || "",
            p_city: metadata.company_city || "",
            p_state: metadata.company_state || "",
          })

          if (companyError) {
            console.error("[v0] Company creation error:", companyError)
            throw new Error(`Failed to create company: ${companyError.message}`)
          }

          console.log("[v0] Company created successfully:", companyData)
        } else if (role === "salesman" || role === "distributor") {
          // Join company for salesman/distributor
          const { error: joinError } = await supabase.rpc("join_company", {
            p_company_code: metadata.company_code,
          })

          if (joinError) {
            console.error("[v0] Join company error:", joinError)
            throw new Error(`Failed to join company: ${joinError.message}`)
          }

          console.log("[v0] Joined company successfully")
        }

        // Redirect to appropriate dashboard
        router.push(`/${role}`)
      } catch (error: unknown) {
        console.error("[v0] Setup error:", error)
        setStatus("error")
        setErrorMessage(error instanceof Error ? error.message : "An error occurred during setup")
      }
    }

    setupProfile()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Setting Up Your Account</CardTitle>
          <CardDescription>Please wait while we complete your registration...</CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" || status === "setting-up" ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-center text-sm text-gray-600">
                {status === "loading" ? "Verifying your account..." : "Creating your profile..."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{errorMessage}</p>
              </div>
              <Button onClick={() => router.push("/auth/login")} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
