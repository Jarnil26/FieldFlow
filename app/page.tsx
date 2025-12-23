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
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import { UserCircle, Truck, Building2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // 🚪 Not logged in → show home
      if (!session?.user) {
        setLoading(false)
        return
      }

      // 🔐 Logged in → redirect by role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (profile?.role) {
        router.push(`/${profile.role}`)
        return
      }

      setLoading(false)
    }

    init()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="absolute right-4 top-4">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Field Sales Manager
          </h1>
          <p className="text-lg text-gray-600">{t("selectRole")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card
            className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            onClick={() => router.push("/auth/login?role=salesman")}
          >
            <CardHeader className="pb-4">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-blue-100 p-6">
                  <UserCircle className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl">
                {t("salesman")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Field visit tracking and order placement
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            onClick={() => router.push("/auth/login?role=distributor")}
          >
            <CardHeader className="pb-4">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-green-100 p-6">
                  <Truck className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl">
                {t("distributor")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Order management and delivery tracking
              </CardDescription>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            onClick={() => router.push("/auth/login?role=owner")}
          >
            <CardHeader className="pb-4">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-purple-100 p-6">
                  <Building2 className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-center text-2xl">
                {t("owner")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Analytics dashboard and business insights
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
