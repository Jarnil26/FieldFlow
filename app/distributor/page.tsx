"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import { Phone, MapPin, LogOut, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

/* ================= TYPES ================= */

interface Shop {
  id: string
  shop_name: string
  mobile_number: string
  address: string
  landmark: string | null
  latitude: number
  longitude: number
}

interface Order {
  id: string
  product_name: string
  quantity: number
  status: string
  created_at: string
  distributor_id: string
  shop_id: string
  shops: Shop // ✅ OBJECT (matches your response)
}

type GroupedOrders = {
  shop: Shop
  orders: Order[]
}

/* ================= COMPONENT ================= */

export default function DistributorPage() {
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()
  const { toast } = useToast()

  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  /* ================= AUTH ================= */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

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
          description: "No company assigned.",
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

  /* ================= FETCH ORDERS ================= */
  useEffect(() => {
    if (!companyId || !user) return

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          product_name,
          quantity,
          status,
          created_at,
          distributor_id,
          shop_id,
          shops (
            id,
            shop_name,
            mobile_number,
            address,
            landmark,
            latitude,
            longitude
          )
        `)
        .eq("status", "pending")
        .eq("company_id", companyId)
        .eq("distributor_id", user.id)
        .order("created_at", { ascending: true })

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      setOrders(data || [])
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, 30000)
    return () => clearInterval(interval)
  }, [companyId, user, supabase, toast])

  /* ================= GROUP BY SHOP ID ================= */
  const groupedOrders = useMemo<GroupedOrders[]>(() => {
    const map: Record<string, GroupedOrders> = {}

    orders.forEach((order) => {
      const shop = order.shops
      if (!shop) return

      if (!map[order.shop_id]) {
        map[order.shop_id] = {
          shop,
          orders: [],
        }
      }

      map[order.shop_id].orders.push(order)
    })

    return Object.values(map)
  }, [orders])

  /* ================= ACTIONS ================= */
  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleOpenMap = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    window.open(url, "_blank")
  }

  const handleMarkDelivered = async (orderId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({
        status: "delivered",
        delivered_by: user.id,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", orderId)

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setOrders((prev) => prev.filter((o) => o.id !== orderId))

    toast({
      title: t("delivered"),
      description: "Order marked as delivered",
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  /* ================= UI ================= */
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
      <div className="mx-auto mt-4 max-w-2xl px-4 space-y-4">
        {groupedOrders.map((group) => (
          <Card key={group.shop.id} className="overflow-hidden bg-white shadow-md">
            {/* Shop Header */}
            <div className="flex justify-between bg-emerald-100 px-4 py-3">
              <div>
                <h2 className="font-semibold">{group.shop.shop_name}</h2>
                <p className="text-xs text-emerald-700">
                  {group.shop.mobile_number}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white"
                  onClick={() => handleCall(group.shop.mobile_number)}
                >
                  <Phone className="mr-1 h-4 w-4" /> Call
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-emerald-600 text-emerald-700"
                  onClick={() =>
                    handleOpenMap(
                      group.shop.latitude,
                      group.shop.longitude
                    )
                  }
                >
                  📍 Map
                </Button>
              </div>
            </div>

            {/* Address */}
            <div className="px-4 py-2 text-sm text-gray-700 flex gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p>{group.shop.address}</p>
                {group.shop.landmark && (
                  <p className="text-xs text-gray-500">
                    {group.shop.landmark}
                  </p>
                )}
              </div>
            </div>

            {/* Orders */}
            <CardContent className="space-y-3">
              {group.orders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-lg border p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{order.product_name}</p>
                    <p className="text-xs text-gray-600">
                      Qty: {order.quantity}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    className="bg-[#0F6BFF] text-white"
                    onClick={() => handleMarkDelivered(order.id)}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    {t("markDelivered")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
  
