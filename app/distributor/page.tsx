"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import { Phone, MapPin, LogOut, Package, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Order {
  id: string
  product_name: string
  quantity: number
  status: string
  created_at: string
  distributor_id: string
  shops: {
    shop_name: string
    mobile_number: string
    address: string
    landmark: string
  }
}

export default function DistributorPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  // AUTH + PROFILE
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.push("/auth/login?role=distributor")
        return
      }

      setUser(session.user)

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single()

      if (error || !profile?.company_id) {
        toast({
          title: "Error",
          description: "No company assigned. Please contact your employer.",
          variant: "destructive",
        })
        await supabase.auth.signOut()
        router.push("/")
        return
      }

      setCompanyId(profile.company_id)
      setLoading(false)
    }

    init()
  }, [router, supabase, toast])

  // FETCH ORDERS - FILTERED BY DISTRIBUTOR_ID
  useEffect(() => {
    if (!companyId || !user) return

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            id,
            product_name,
            quantity,
            status,
            created_at,
            distributor_id,
            shops (
              shop_name,
              mobile_number,
              address,
              landmark
            )
          `,
          )
          .eq("status", "pending")
          .eq("company_id", companyId)
          .eq("distributor_id", user.id) // ✅ ONLY SHOW ORDERS ASSIGNED TO THIS DISTRIBUTOR
          .order("created_at", { ascending: true })

        if (error) throw error
        setOrders(data || [])
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to fetch orders",
          variant: "destructive",
        })
      }
    }

    fetchOrders()

    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [companyId, user, supabase, toast])

  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`
  }

  const handleMarkDelivered = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_by: user.id,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", orderId)

      if (error) throw error

      toast({
        title: t("delivered"),
        description: "Order marked as delivered",
      })

      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#E9FFF1] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#E9FFF1]/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
              {t("distributor")}
            </p>
            <h1 className="text-xl font-bold text-slate-900">
              ઓર્ડર કતાર
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white text-xs">
              {orders.length} {t("pendingOrders")}
            </Badge>
            <LanguageSelector />
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto mt-4 max-w-2xl px-4">
        {orders.length === 0 ? (
          <Card className="border-none bg-white/90 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg text-gray-600">{t("noOrders")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden border-none bg-white shadow-md"
              >
                {/* Top strip */}
                <div className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {order.shops.shop_name}
                    </h2>
                    <p className="text-xs text-emerald-700">
                      {order.shops.mobile_number}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                    onClick={() => handleCall(order.shops.mobile_number)}
                  >
                    <Phone className="mr-1.5 h-4 w-4" />
                    {t("call")}
                  </Button>
                </div>

                {/* Body */}
                <CardContent className="space-y-3 px-4 pt-4 pb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {order.shops.address}
                      </p>
                      {order.shops.landmark && (
                        <p className="text-xs text-gray-600">
                          {order.shops.landmark}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Package className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {order.product_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        Qty: {order.quantity}
                      </p>
                    </div>
                  </div>
                </CardContent>

                {/* Single bottom CTA */}
                <div className="bg-[#0F6BFF] px-4 py-3">
                  <Button
                    className="flex w-full items-center justify-center gap-2 bg-[#0F6BFF] text-sm font-semibold text-white hover:bg-[#0b54c6]"
                    onClick={() => handleMarkDelivered(order.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {t("markDelivered")}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
