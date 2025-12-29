"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
// Added ArrowRight to the imports below
import { UserCircle, Truck, Building2, ArrowRight } from "lucide-react"

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

      if (!session?.user) {
        setLoading(false)
        return
      }

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
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent"></div>
          <p className="text-lg font-semibold text-white">{t("loading")}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#8B0000] selection:bg-[#E31E24]/30">
      {/* Decorative Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#E31E24]/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-[#FFCE00]/10 blur-[120px]" />

      {/* Language Switcher */}
      <div className="absolute right-6 top-6 z-50">
        <div className="rounded-full bg-white/10 p-1 backdrop-blur-xl ring-1 ring-white/20">
          <LanguageSelector />
        </div>
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
        
        {/* Hero Section */}
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="group relative mb-8">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#FFCE00] to-[#E31E24] opacity-25 blur transition duration-1000 group-hover:opacity-50" />
            <div className="relative rounded-3xl bg-white/10 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-white/20">
              <Image
                src="/logo/purohit-logo.png"
                alt="Purohit"
                width={220}
                height={220}
                className="h-auto w-[180px] sm:w-[220px] object-contain brightness-110"
                priority
              />
            </div>
          </div>

          <h1 className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
            Purohit Grow
          </h1>
          
          <div className="mt-6 space-y-2">
            <p className="text-xl font-medium tracking-wide text-[#FFCE00] drop-shadow-sm">
              પુરોહિત સાથે, વ્યવસાયનો વિશ્વાસુ વિકાસ
            </p>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-white/60">
              એક જ વિશ્વસનીય કંપની માટે સ્માર્ટ ફિલ્ડ સેલ્સ મેનેજર.
            </p>
          </div>

          <div className="mt-10 inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-white/80 ring-1 ring-white/10">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FFCE00] opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FFCE00]"></span>
            </span>
            {t("selectRole")}
          </div>
        </div>

        {/* Role Selection Grid */}
        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {[
            { 
              id: 'salesman', 
              icon: UserCircle, 
              color: 'bg-[#FFE6E7]', 
              text: '#E31E24', 
              label: t("salesman"), 
              desc: "Field visit tracking and order placement" 
            },
            { 
              id: 'distributor', 
              icon: Truck, 
              color: 'bg-[#FFF5CC]', 
              text: '#FFCE00', 
              label: t("distributor"), 
              desc: "Order management and delivery tracking" 
            },
            { 
              id: 'owner', 
              icon: Building2, 
              color: 'bg-[#FFE6FF]', 
              text: '#E31E24', 
              label: t("owner"), 
              desc: "Analytics dashboard and business insights" 
            }
          ].map((role) => (
            <div
              key={role.id}
              onClick={() => router.push(`/auth/login?role=${role.id}`)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl bg-white/[0.03] p-px transition-all hover:bg-white/[0.08]"
            >
              <div className="relative h-full rounded-[23px] bg-white/95 p-8 shadow-2xl transition-all duration-300 group-hover:-translate-y-1 group-hover:bg-white">
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ${role.color} shadow-inner transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-110`}>
                    <role.icon className="h-10 w-10" style={{ color: role.text }} />
                  </div>
                  
                  <h3 className="mb-2 text-2xl font-bold text-slate-900">
                    {role.label}
                  </h3>
                  
                  <p className="text-sm leading-relaxed text-slate-500">
                    {role.desc}
                  </p>

                  <div 
                    className="mt-6 flex items-center text-xs font-bold uppercase tracking-wider transition-all duration-300 group-hover:gap-3" 
                    style={{ color: role.text }}
                  >
                    Get Started 
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Branding */}
        <footer className="mt-20 opacity-40 transition-opacity hover:opacity-100">
          <p className="text-xs tracking-[0.2em] text-white">
            POWERED BY PUROHIT GROUP
          </p>
        </footer>
      </main>
    </div>
  )
}