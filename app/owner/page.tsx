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
import { LogOut, MapIcon, BarChart3, Download, Trash2, Phone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import dynamic from "next/dynamic"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  problem_description: string | null
  created_at: string
  selfie_url?: string
}

interface SessionRow {
  id: string
  user_id: string
  name: string | null
  login_at: string
  logout_at: string | null
  duration_minutes: number | null
}

interface ShopProductRow {
  shop_id: string
  shop_name: string
  product_name: string
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

  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [shopProducts, setShopProducts] = useState<ShopProductRow[]>([])

  const [addOpen, setAddOpen] = useState(false)
  const [newProductName, setNewProductName] = useState("")
  const [newProductFile, setNewProductFile] = useState<File | null>(null)
  const [addingProduct, setAddingProduct] = useState(false)

  const CATEGORIES = [
    "5rs product",
    "10rs Product",
    "200 gram product",
    "250 gram product",
    "400 gram product",
    "500 gram product",
    "800 gram product",
    "mamra product",
  ];
  const [category, setCategory] = useState("");

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

  /* -------------------- FETCH DATA -------------------- */
  useEffect(() => {
    if (!company?.id) return
    fetchData(company.id)
    fetchSessions(company.id)
    fetchShopProducts(company.id)
  }, [company])

  const fetchData = async (companyId: string) => {
    if (!companyId) return

    try {
      const { data: shopsData, error } = await supabase
        .from("shops")
        .select(`
          *,
          problem_description
        `)
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const list = shopsData || [] as Shop[]
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

  const fetchSessions = async (companyId: string) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("login_sessions")
        .select("id, user_id, login_at, logout_at, duration_minutes")
        .eq("company_id", companyId)
        .order("login_at", { ascending: false })

      if (sessionError) throw sessionError
      const sessionsList = sessionData || []

      if (sessionsList.length === 0) {
        setSessions([])
        return
      }

      const userIds = Array.from(new Set(sessionsList.map((s: any) => s.user_id)))

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      if (profilesError) throw profilesError

      const nameMap = new Map<string, string | null>()
        ; (profilesData || []).forEach((p: any) => {
          nameMap.set(p.id, p.full_name ?? null)
        })

      const mapped: SessionRow[] = sessionsList.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        name: nameMap.get(row.user_id) ?? null,
        login_at: row.login_at,
        logout_at: row.logout_at,
        duration_minutes: row.duration_minutes,
      }))

      setSessions(mapped)
    } catch (err: any) {
      console.error("fetchSessions error", err)
      toast({
        title: "Error",
        description: err?.message || "Failed to load sessions",
        variant: "destructive",
      })
    }
  }

  const fetchShopProducts = async (companyId: string) => {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select(
          `
          shop_id,
          product_name,
          shops!inner (
            id,
            shop_name
          )
        `,
        )
        .eq("company_id", companyId)
        .order("shop_name", { foreignTable: "shops" })
        .order("product_name")

      if (error) throw error

      const mapped: ShopProductRow[] =
        (data || []).map((row: any) => ({
          shop_id: row.shop_id,
          shop_name: row.shops.shop_name,
          product_name: row.product_name,
        })) ?? []

      setShopProducts(mapped)
    } catch (err: any) {
      console.error("fetchShopProducts error", err)
      toast({
        title: "Error",
        description: err?.message || "Failed to load product availability",
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
      "Problem Description",
      "Date",
    ]

    const rows = shops.map((shop) => [
      shop.shop_name,
      shop.mobile_number,
      shop.address,
      shop.landmark || "",
      shop.product_available ? "Yes" : "No",
      shop.problem_type || "",
      shop.problem_description || "",
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company?.id) return

    if (!newProductName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter product name",
        variant: "destructive",
      })
      return
    }

    if (!newProductFile) {
      toast({
        title: "Image required",
        description: "Please select a packet image",
        variant: "destructive",
      })
      return
    }

    setAddingProduct(true)
    try {
      const bucket = "product-images"

      const fileExt = newProductFile.name.split(".").pop() || "jpg"
      const filePath = `${company.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, newProductFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: newProductFile.type || "image/jpeg",
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath)
      const imageUrl = urlData?.publicUrl

      // Find this section inside handleAddProduct
      const { error: insertError } = await supabase.from("products").insert({
        company_id: company.id,
        name: newProductName.trim(),
        category: category,      // <--- ADD THIS LINE
        image_url: imageUrl,
        status: "active",
      })

      if (insertError) throw insertError

      toast({
        title: t("productAdded") || "Product added", // Use translation if available
        description: "Product created successfully",
      })

      setNewProductName("")
      setCategory("")            // <--- ADD THIS LINE to reset the dropdown
      setNewProductFile(null)
      setAddOpen(false)
    } catch (err: any) {
      console.error("UPLOAD DEBUG ERROR", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add product",
        variant: "destructive",
      })
    } finally {
      setAddingProduct(false)
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

  // group shopProducts by shop_id for display
  const availabilityByShop = Object.entries(
    shopProducts.reduce((acc: any, row) => {
      if (!acc[row.shop_id]) {
        acc[row.shop_id] = { name: row.shop_name, products: [] as string[] }
      }
      acc[row.shop_id].products.push(row.product_name)
      return acc
    }, {}),
  )

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
        <div className="mb-6 flex flex-wrap gap-3">
          <Button onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" /> {t("exportData")}
          </Button>
          <Button variant="destructive" onClick={clearRecords}>
            <Trash2 className="mr-2 h-4 w-4" /> {t("clearRecords")}
          </Button>

          {/* Add Product dialog */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">+ Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddProduct} className="space-y-4">
                {/* Product Name */}
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="Soya Chips"
                    required
                  />
                </div>

                {/* Category Selection */}
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="" disabled>Select a category</option>
                    <option value="5rs product">5rs product</option>
                    <option value="10rs Product">10rs Product</option>
                    <option value="200 gram product">200 gram product</option>
                    <option value="250 gram product">250 gram product</option>
                    <option value="400 gram product">400 gram product</option>
                    <option value="500 gram product">500 gram product</option>
                    <option value="800 gram product">800 gram product</option>
                    <option value="mamra product">Mamra product</option>
                  </select>
                </div>

                {/* Product Image */}
                <div>
                  <Label htmlFor="productImage">Product Image</Label>
                  <Input
                    id="productImage"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setNewProductFile(file)
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Image will be uploaded to Supabase Storage bucket <code>product-images</code>.
                  </p>
                </div>

                <Button type="submit" disabled={addingProduct} className="w-full">
                  {addingProduct ? "Saving..." : "Save Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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
                <div className="space-y-8">
                  {/* Work time table */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Salesman Work Time</h3>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sessions recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Login</th>
                              <th className="px-3 py-2 text-left">Logout</th>
                              <th className="px-3 py-2 text-left">Total (min)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sessions.map((s) => {
                              const login = new Date(s.login_at)
                              const logout = s.logout_at ? new Date(s.logout_at) : null
                              const dateStr = login.toLocaleDateString()
                              const loginStr = login.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                              const logoutStr = logout
                                ? logout.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                                : "-"
                              const mins =
                                s.duration_minutes ??
                                (logout
                                  ? Math.round(
                                    (logout.getTime() - login.getTime()) / 60000,
                                  )
                                  : null)

                              return (
                                <tr key={s.id} className="border-t">
                                  <td className="px-3 py-2">
                                    {s.name ?? s.user_id.slice(0, 6)}
                                  </td>
                                  <td className="px-3 py-2">{dateStr}</td>
                                  <td className="px-3 py-2">{loginStr}</td>
                                  <td className="px-3 py-2">{logoutStr}</td>
                                  <td className="px-3 py-2">
                                    {mins != null ? mins : "-"}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* SIMPLIFIED: Problem Analysis - EXACTLY AS IN DB */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Problem Analysis</h3>
                    <div className="space-y-2">
                      {["price_high", "no_space", "competitor", "other"].map((type) => {
                        const count = shops.filter((s) => s.problem_type === type).length
                        if (count === 0) return null

                        return (
                          <div key={type}>
                            <div className="flex items-center justify-between rounded-lg border p-3">
                              <span className="capitalize">
                                {type.replace("_", " ")} ({count})
                              </span>
                              <Badge>{count}</Badge>
                            </div>

                            {/* ONLY FOR "OTHER" - Show raw DB descriptions WITH SHOP NAME + PHONE + DATE */}
                            {type === "other" && (
                              <div className="ml-6 space-y-2">
                                {shops
                                  .filter((s) => s.problem_type === "other" && s.problem_description)
                                  .slice(0, 8)
                                  .map((shop, idx) => (
                                    <div
                                      key={shop.id}
                                      className="bg-yellow-50 border-l-4 border-yellow-400 pl-4 pr-3 py-3 rounded-r-lg"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div>
                                          <p className="text-sm font-semibold text-gray-900">
                                            {shop.shop_name}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                            <Phone className="h-3 w-3" />
                                            <span>{shop.mobile_number}</span>
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {new Date(shop.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-sm font-medium text-gray-900 break-words border-t pt-2 mt-2">
                                        "{shop.problem_description}"
                                      </p>
                                    </div>
                                  ))}
                                {shops.filter((s) => s.problem_type === "other").length > 8 && (
                                  <p className="text-xs text-gray-500 ml-6">
                                    +{shops.filter((s) => s.problem_type === "other").length - 8} more...
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Product availability by shop */}
                  <div>
                    <h3 className="mb-3 text-lg font-semibold">Product Availability</h3>
                    {availabilityByShop.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No availability data recorded yet.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="min-w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left">Shop</th>
                              <th className="px-3 py-2 text-left">Products Available</th>
                            </tr>
                          </thead>
                          <tbody>
                            {availabilityByShop.map(([shopId, info]: any) => (
                              <tr key={shopId} className="border-t">
                                <td className="px-3 py-2 align-top font-medium">
                                  {info.name}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {info.products.map((p: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="mb-1">
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Recent Visits - RAW DB data */}
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
                            <Badge variant={shop.product_available ? "default" : "destructive"}>
                              {shop.product_available ? "Stocked" : "Rejected"}
                            </Badge>
                          </div>

                          {/* RAW problem info from DB */}
                          {!shop.product_available && shop.problem_type && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-1 bg-gray-200 text-xs rounded-full">
                                  {shop.problem_type.replace("_", " ")}
                                </span>
                              </div>
                              {shop.problem_description && (
                                <p className="text-sm text-gray-800 bg-white p-2 rounded border-l-4 border-gray-400">
                                  "{shop.problem_description}"
                                </p>
                              )}
                            </div>
                          )}

                          {shop.selfie_url && (
                            <img
                              src={shop.selfie_url}
                              alt="Shop"
                              className="mt-3 h-32 w-full rounded object-cover"
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
