"use client"

import Image from "next/image"
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
      <div className="flex min-h-screen items-center justify-center bg-[#E31E24]">
        <p className="text-lg font-semibold text-white">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#E31E24] px-4 py-4">
      {/* yellow top-right blob */}
      <div className="pointer-events-none absolute right-[-80px] top-[-80px] h-56 w-56 rounded-full bg-[#FFCE00] opacity-70 blur-2xl" />
      {/* yellow bottom-left blob */}
      <div className="pointer-events-none absolute bottom-[-80px] left-[-80px] h-56 w-56 rounded-full bg-[#FFCE00] opacity-60 blur-2xl" />

      <div className="absolute right-4 top-4 z-20">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            Field Sales Manager
          </h1>
          <p className="text-lg text-gray-600">{t("selectRole")}</p>
        </div>



        {/* Role cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Salesman */}
          <Card
            className="cursor-pointer border-none bg-white/95 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => router.push("/auth/login?role=salesman")}
          >
            <CardHeader className="pb-3">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-[#FFE6E7] p-5">
                  <UserCircle className="h-10 w-10 text-[#E31E24]" />
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

          {/* Distributor */}
          <Card
            className="cursor-pointer border-none bg-white/95 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => router.push("/auth/login?role=distributor")}
          >
            <CardHeader className="pb-3">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-[#FFF5CC] p-5">
                  <Truck className="h-10 w-10 text-[#FFCE00]" />
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

          {/* Owner */}
          <Card
            className="cursor-pointer border-none bg-white/95 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
            onClick={() => router.push("/auth/login?role=owner")}
          >
            <CardHeader className="pb-3">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-[#FFE6FF] p-5">
                  <Building2 className="h-10 w-10 text-[#E31E24]" />
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
