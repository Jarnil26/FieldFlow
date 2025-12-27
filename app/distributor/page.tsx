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
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login?role=distributor")
        return
      }
      setUser(user)

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (!profile?.company_id) {
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

    checkUser()
  }, [router, supabase, toast])

  // Fetch orders only after companyId is known
  useEffect(() => {
    if (!companyId || loading) return
    fetchOrders()
  }, [companyId, loading])

  const fetchOrders = async () => {
    if (!companyId) return

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
        `,
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

      fetchOrders()
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 pb-8">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">{t("distributor")}</h1>
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
              <CardTitle className="text-xl">{t("orderQueue")}</CardTitle>
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
              <Card
                key={order.id}
                className="overflow-hidden border border-green-100 bg-white shadow-sm"
              >
                {/* Top strip */}
                <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-100 px-4 py-3">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      {order.shops.shop_name}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleCall(order.shops.mobile_number)}
                      className="mt-1 inline-flex items-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      {order.shops.mobile_number}
                    </button>
                  </div>

                  <Button
                    size="sm"
                    className="rounded-full bg-emerald-600 px-4 text-sm font-semibold hover:bg-emerald-700"
                    onClick={() => handleCall(order.shops.mobile_number)}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    {t("call")}
                  </Button>
                </div>

                {/* Middle content */}
                <CardContent className="space-y-3 px-4 pt-4 pb-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {order.shops.address}
                      </p>
                      {order.shops.landmark && (
                        <p className="text-xs text-gray-500">{order.shops.landmark}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Package className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {order.product_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {order.quantity}
                      </p>
                    </div>
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
