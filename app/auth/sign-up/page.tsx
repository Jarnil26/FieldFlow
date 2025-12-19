"use client"

import type React from "react"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showSecretKey, setShowSecretKey] = useState(false)
  const role = searchParams.get("role") || "salesman"

  const [companyName, setCompanyName] = useState("")
  const [ownerPhone, setOwnerPhone] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyCity, setCompanyCity] = useState("")
  const [companyState, setCompanyState] = useState("")
  const [secretKey, setSecretKey] = useState("")

  const [companyCode, setCompanyCode] = useState("")

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      if (role === "owner") {
        const OWNER_SECRET_KEY = process.env.OWNER_SECRET_KEY || "FSM2025SECURE";
        if (secretKey !== OWNER_SECRET_KEY) {
          throw new Error("Invalid secret key. Only authorized owners can register.")
        }

        if (!companyName || !ownerPhone) {
          throw new Error("Please fill in all required company details (name and phone)")
        }
      }

      if (role === "salesman" || role === "distributor") {
        if (!companyCode || companyCode.length !== 6) {
          throw new Error("Please enter a valid 6-character company code")
        }

        // Verify company code exists before signup
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .select("id")
          .eq("company_code", companyCode.toUpperCase())
          .single()

        if (companyError || !companyData) {
          throw new Error("Invalid company code. Please check with your employer.")
        }
      }

      // Store setup data in user metadata to use after email verification
      const metadata: Record<string, any> = {
        full_name: fullName,
        role: role,
      }

      if (role === "owner") {
        metadata.company_name = companyName
        metadata.owner_phone = ownerPhone
        metadata.company_address = companyAddress
        metadata.company_city = companyCity
        metadata.company_state = companyState
      }

      if (role === "salesman" || role === "distributor") {
        metadata.company_code = companyCode.toUpperCase()
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/setup`,
          data: metadata,
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Failed to create user")

      // Success - redirect to check email page
      router.push("/auth/sign-up-success")
    } catch (error: unknown) {
      console.error("[v0] Sign-up error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during sign up")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to generate unique company code
  const generateCompanyCode = async (supabase: any): Promise<string> => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""

    while (true) {
      code = ""
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length))
      }

      const { data } = await supabase.from("companies").select("id").eq("company_code", code).single()

      if (!data) break
    }

    return code
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t("signUp")}</CardTitle>
            <CardDescription>
              {t("role")}: {t(role as "salesman" | "distributor" | "owner")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">{t("fullName")}</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 pr-12 text-base"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-500" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-500" />
                      )}
                    </Button>
                  </div>
                </div>

                {role === "owner" && (
                  <>
                    <div className="rounded-lg border-2 border-yellow-400 bg-yellow-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-yellow-800">{t("companyDetails")}</p>
                      <div className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="companyName">{t("companyName")}</Label>
                          <Input
                            id="companyName"
                            type="text"
                            placeholder="ABC Distributors"
                            required
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="ownerPhone">{t("phone")}</Label>
                          <Input
                            id="ownerPhone"
                            type="tel"
                            placeholder="+91 98765 43210"
                            required
                            value={ownerPhone}
                            onChange={(e) => setOwnerPhone(e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="companyAddress">{t("address")}</Label>
                          <Input
                            id="companyAddress"
                            type="text"
                            placeholder="Office address"
                            value={companyAddress}
                            onChange={(e) => setCompanyAddress(e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="companyCity">{t("city")}</Label>
                            <Input
                              id="companyCity"
                              type="text"
                              placeholder="City"
                              value={companyCity}
                              onChange={(e) => setCompanyCity(e.target.value)}
                              className="h-12 text-base"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="companyState">{t("state")}</Label>
                            <Input
                              id="companyState"
                              type="text"
                              placeholder="State"
                              value={companyState}
                              onChange={(e) => setCompanyState(e.target.value)}
                              className="h-12 text-base"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="secretKey" className="flex items-center gap-2">
                        {t("secretKey")} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          id="secretKey"
                          type={showSecretKey ? "text" : "password"}
                          placeholder={t("enterSecretKey")}
                          required
                          value={secretKey}
                          onChange={(e) => setSecretKey(e.target.value)}
                          className="h-12 pr-12 text-base"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-12 w-12 hover:bg-transparent"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                        >
                          {showSecretKey ? (
                            <EyeOff className="h-5 w-5 text-gray-500" />
                          ) : (
                            <Eye className="h-5 w-5 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">{t("secretKeyHelp")}</p>
                    </div>
                  </>
                )}

                {(role === "salesman" || role === "distributor") && (
                  <div className="rounded-lg border-2 border-blue-400 bg-blue-50 p-4">
                    <div className="grid gap-2">
                      <Label htmlFor="companyCode" className="flex items-center gap-2">
                        {t("companyCode")} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="companyCode"
                        type="text"
                        placeholder="ABC123"
                        required
                        value={companyCode}
                        onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                        className="h-12 text-base font-mono"
                        maxLength={6}
                      />
                      <p className="text-xs text-gray-600">{t("companyCodeHelp")}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <Button type="submit" className="h-12 w-full text-base" disabled={isLoading}>
                  {isLoading ? t("loading") : t("signUp")}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t("alreadyHaveAccount")}{" "}
                <Link href={`/auth/login?role=${role}`} className="underline underline-offset-4">
                  {t("login")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
