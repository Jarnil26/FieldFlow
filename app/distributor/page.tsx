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

  // 🔐 AUTH + PROFILE CHECK (FIXED)
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

  // 📦 FETCH ORDERS (FIXED TIMING)
  useEffect(() => {
    if (!companyId) return

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
            shops (
              shop_name,
              mobile_number,
              address,
              landmark
            )
          `
          )
          .eq("status", "pending")
          .eq("company_id", companyId)
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
  }, [companyId, supabase, toast])

  // 📞 CALL SHOP''
  const handleCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`
  }

  // ✅ MARK DELIVERED
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

      // refresh orders
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update order",
        variant: "destructive",
      })
    }
  }

  // 🚪 LOGOUT
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // ⏳ LOADING STATE
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  // 🎯 DASHBOARD UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 pb-8">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("distributor")}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">
                {t("orderQueue")}
              </CardTitle>
              <Badge variant="secondary" className="text-base">
                {orders.length} {t("pendingOrders")}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="mb-4 h-16 w-16 text-gray-400" />
              <p className="text-lg text-gray-600">{t("noOrders")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-green-100 to-teal-100 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {order.shops.shop_name}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        {order.shops.mobile_number}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className="h-14 bg-green-600 hover:bg-green-700"
                      onClick={() =>
                        handleCall(order.shops.mobile_number)
                      }
                    >
                      {order.shops.mobile_number}
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-1 h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {order.shops.address}
                        </p>
                        {order.shops.landmark && (
                          <p className="text-sm text-gray-600">
                            {order.shops.landmark}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {order.product_name} × {order.quantity}
                      </p>
                    </div>

                    <Button
                      className="mt-4 h-14 w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleMarkDelivered(order.id)}
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      {t("markDelivered")}
                    </Button>
                  </div>
                </CardContent>

                {/* Bottom CTA */}
                <div className="border-t bg-blue-600 px-4 py-3">
                  <Button
                    className="flex w-full items-center justify-center gap-2 bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700"
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
