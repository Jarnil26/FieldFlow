"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import { UserCircle, Truck, Building2 } from "lucide-react"

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (profile?.role) {
          router.push(`/${profile.role}`)
          return
        }
      }
      setLoading(false)
    }

    checkUser()
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

      <div className="z-10 w-full max-w-4xl">
        {/* Logo + brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="max-w-xs sm:max-w-sm md:max-w-md w-full flex justify-center">
            <Image
              src="/logo/purohit-logo.png"
              alt="Purohit Grow"
              width={320}          // logical size in CSS pixels
              height={160}
              className="h-auto w-full max-w-[260px] sm:max-w-[320px] object-contain drop-shadow-lg"
              priority
            />
          </div>

          <h1 className="mt-4 mb-1 text-4xl font-extrabold tracking-tight text-white">
            Purohit Grow
          </h1>
          <p className="text-lg font-medium text-[#FFCE00]">
            પુરોહિત સાથે, વ્યવસાયનો વિશ્વાસુ વિકાસ
          </p>
          <p className="mt-2 text-sm text-white/80">
            Smart field sales platform for distributors, owners, and sales teams.
          </p>
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
              <CardTitle className="text-center text-xl text-[#E31E24]">
                {t("salesman")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-sm text-gray-700">
                Shop visit capture, live location and order booking.
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
              <CardTitle className="text-center text-xl text-[#E31E24]">
                {t("distributor")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-sm text-gray-700">
                Manage orders, deliveries and stock fulfillment.
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
              <CardTitle className="text-center text-xl text-[#E31E24]">
                {t("owner")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center text-sm text-gray-700">
                Attendance, visit analytics and performance insights.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
