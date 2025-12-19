"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"
import { LogOut, MapIcon, BarChart3, Download, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"

const MapView = dynamic(() => import("@/components/map-view"), { ssr: false })

interface Shop {
  id: string
  shop_name: string
  mobile_number: string
  latitude: number
  longitude: number
  address: string
  landmark: string
  product_available: boolean
  problem_type: string | null
  created_at: string
  selfie_url?: string
}

export default function OwnerPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shops, setShops] = useState<Shop[]>([])
  const [stats, setStats] = useState({
    totalVisits: 0,
    productsStocked: 0,
    rejections: 0,
  })

  /* -------------------- AUTH + COMPANY -------------------- */
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login?role=owner")
        return
      }

      setUser(user)

      const { data: companyData, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_id", user.id)
        .single()

      if (error || !companyData) {
        toast({
          title: "Error",
          description: "No company found. Please contact support.",
          variant: "destructive",
        })
        await supabase.auth.signOut()
        router.push("/")
        return
      }

      setCompany(companyData)
      setLoading(false)
    }

    init()
  }, [router, supabase, toast])

  /* -------------------- FETCH SHOPS (SAFE) -------------------- */
  useEffect(() => {
    if (!company?.id) return
    fetchData(company.id)
  }, [company])

  const fetchData = async (companyId: string) => {
    if (!companyId) return

    try {
      console.log("Fetching shops for company:", companyId)

      const { data: shopsData, error } = await supabase
        .from("shops")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const list = shopsData || []
      setShops(list)

      setStats({
        totalVisits: list.length,
        productsStocked: list.filter((s) => s.product_available).length,
        rejections: list.filter((s) => !s.product_available).length,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch data",
        variant: "destructive",
      })
    }
  }

  /* -------------------- ACTIONS -------------------- */
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const exportToCSV = () => {
    const headers = [
      "Shop Name",
      "Mobile",
      "Address",
      "Landmark",
      "Product Available",
      "Problem Type",
      "Date",
    ]

    const rows = shops.map((shop) => [
      shop.shop_name,
      shop.mobile_number,
      shop.address,
      shop.landmark || "",
      shop.product_available ? "Yes" : "No",
      shop.problem_type || "",
      new Date(shop.created_at).toLocaleDateString(),
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `field-sales-data-${new Date().toISOString().split("T")[0]}.csv`
    a.click()

    toast({ title: "Export Complete", description: "CSV downloaded successfully" })
  }

  const clearRecords = async () => {
    if (!confirm("Are you sure you want to clear all monthly records?")) return

    try {
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("company_id", company.id)

      if (error) throw error

      toast({ title: "Records Cleared" })
      fetchData(company.id)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to clear records",
        variant: "destructive",
      })
    }
  }

  /* -------------------- UI -------------------- */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">{t("owner")}</h1>
            <p className="text-sm text-gray-600">
              {company.company_name} ·{" "}
              <span className="font-mono font-bold">{company.company_code}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <LanguageSelector />
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl p-4">
        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatCard title={t("totalVisits")} value={stats.totalVisits} />
          <StatCard title={t("productsStocked")} value={stats.productsStocked} color="green" />
          <StatCard title={t("rejections")} value={stats.rejections} color="red" />
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" /> {t("exportData")}
          </Button>
          <Button variant="destructive" onClick={clearRecords}>
            <Trash2 className="mr-2 h-4 w-4" /> {t("clearRecords")}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="map">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="map">
              <MapIcon className="mr-2 h-4 w-4" /> {t("mapView")}
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="mr-2 h-4 w-4" /> {t("analytics")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="map">
            <Card className="mt-4">
              <CardContent className="pt-6">
                <MapView shops={shops} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">

                  {/* Problem Analysis */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Problem Analysis</h3>
                    <div className="space-y-2">
                      {["price_high", "no_space", "competitor", "other"].map((type) => {
                        const count = shops.filter((s) => s.problem_type === type).length
                        if (count === 0) return null

                        return (
                          <div
                            key={type}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <span className="capitalize">
                              {type.replace("_", " ")}
                            </span>
                            <Badge>{count}</Badge>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recent Visits */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Recent Visits</h3>
                    <div className="space-y-3">
                      {shops.slice(0, 10).map((shop) => (
                        <div key={shop.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{shop.shop_name}</p>
                              <p className="text-sm text-gray-600">{shop.address}</p>
                            </div>
                            <Badge
                              variant={shop.product_available ? "default" : "destructive"}
                            >
                              {shop.product_available ? "Stocked" : "Rejected"}
                            </Badge>
                          </div>

                          {shop.selfie_url && (
                            <img
                              src={shop.selfie_url}
                              alt="Shop"
                              className="mt-2 h-32 w-full rounded object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}

/* -------------------- SMALL HELPER -------------------- */
function StatCard({ title, value, color }: any) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${color ? `text-${color}-600` : ""}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
