"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LanguageSelector } from "@/components/language-selector"
import { useLanguage } from "@/lib/language-context"

import {
  Camera,
  MapPin,
  LogOut,
  Plus,
  Minus,
  Menu,
  ShoppingCart,
  ChevronDown,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

export default function SalesmanPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [todayVisits, setTodayVisits] = useState(0)

  // login_sessions row id
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Form fields
  const [shopName, setShopName] = useState("")
  const [mobileNo, setMobileNo] = useState("")
  const [landmark, setLandmark] = useState("")
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState("")
  const [selfieUrl, setSelfieUrl] = useState("")
  const [productAvailable, setProductAvailable] = useState<boolean | null>(null)
  const [problemType, setProblemType] = useState("")
  const [otherProblemDescription, setOtherProblemDescription] = useState("") // NEW: Other problem input

  // DISTRIBUTOR - NEW
  const [distributors, setDistributors] = useState<any[]>([])
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("")

  // Product catalog states
  const [catalogExpanded, setCatalogExpanded] = useState(false)
  const [newProductsExpanded, setNewProductsExpanded] = useState(false)

  // AVAILABLE products -> only boolean selection
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [selectedAvailableProducts, setSelectedAvailableProducts] = useState<{
    [key: string]: boolean
  }>({})

  // NEW products -> selection + quantity
  const [newProducts, setNewProducts] = useState<any[]>([])
  const [selectedNewProducts, setSelectedNewProducts] = useState<{
    [key: string]: number
  }>({})

  const [loadingProducts, setLoadingProducts] = useState(false)

  /* --------- SESSION HELPERS (login_sessions table) --------- */

  const startSession = async (userId: string, companyId: string) => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: existing, error: selectError } = await supabase
        .from("login_sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("company_id", companyId)
        .is("logout_at", null)
        .gte("login_at", today.toISOString())
        .lt("login_at", tomorrow.toISOString())
        .maybeSingle()

      if (existing && !selectError) {
        setSessionId(existing.id)
        return
      }

      const { data: inserted, error: insertError } = await supabase
        .from("login_sessions")
        .insert({
          user_id: userId,
          company_id: companyId,
          login_at: new Date().toISOString(),
        })
        .select("id")
        .single()

      if (insertError) throw insertError
      setSessionId(inserted.id)
    } catch (err) {
      console.error("startSession error", err)
    }
  }

  const endSession = async () => {
    if (!sessionId) return
    try {
      const logoutAt = new Date()
      const { data, error } = await supabase
        .from("login_sessions")
        .update({ logout_at: logoutAt.toISOString() })
        .eq("id", sessionId)
        .select("login_at")
        .single()

      if (!error && data?.login_at) {
        const loginAt = new Date(data.login_at)
        const durationMinutes = Math.round(
          (logoutAt.getTime() - loginAt.getTime()) / 60000,
        )
        await supabase
          .from("login_sessions")
          .update({ duration_minutes: durationMinutes })
          .eq("id", sessionId)
      }
    } catch (err) {
      console.error("Failed to end session", err)
    } finally {
      setSessionId(null)
    }
  }

  const forceLogout = async (reason: string) => {
    toast({
      title: "Session ended",
      description: reason,
    })
    await endSession()
    await supabase.auth.signOut()
    router.push("/auth/login?role=salesman")
  }

  /* -------------------- INIT: AUTH + PROFILE -------------------- */
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login?role=salesman")
        return
      }
      setUser(user)

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.company_id) {
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
      await loadTodayVisits(user.id)
      await startSession(user.id, profile.company_id)
      setLoading(false)
    }

    init()
  }, [router, supabase, toast])

  /* -------- AUTO-LOGOUT: midnight + no movement 20 min -------- */
  useEffect(() => {
    if (!user) return

    const now = new Date()
    const nextMidnight = new Date()
    nextMidnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = nextMidnight.getTime() - now.getTime()

    const midnightTimeout = window.setTimeout(() => {
      forceLogout("Auto-logout at midnight.")
    }, msUntilMidnight)

    let watchId: number | null = null
    let lastMoveTime = Date.now()
    let lastCoords: { lat: number; lon: number } | null = null

    const MOVEMENT_THRESHOLD_METERS = 50
    const MAX_IDLE_MS = 20 * 60 * 1000

    const toRad = (v: number) => (v * Math.PI) / 180
    const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371000
      const dLat = toRad(lat2 - lat1)
      const dLon = toRad(lon2 - lon1)
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return R * c
    }

    if ("geolocation" in navigator) {
      const success = (pos: GeolocationPosition) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude

        if (!lastCoords) {
          lastCoords = { lat, lon }
          lastMoveTime = Date.now()
          return
        }

        const d = distanceMeters(lastCoords.lat, lastCoords.lon, lat, lon)
        if (d >= MOVEMENT_THRESHOLD_METERS) {
          lastCoords = { lat, lon }
          lastMoveTime = Date.now()
        }
      }

      const error = (err: GeolocationPositionError) => {
        console.warn("watchPosition error", err)
      }

      watchId = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 30000,
      })
    }

    const idleInterval = window.setInterval(() => {
      if (Date.now() - lastMoveTime > MAX_IDLE_MS) {
        forceLogout("No movement detected for 20 minutes.")
        if (watchId != null) navigator.geolocation.clearWatch(watchId)
        window.clearInterval(idleInterval)
        window.clearTimeout(midnightTimeout)
      }
    }, 60_000)

    return () => {
      window.clearTimeout(midnightTimeout)
      window.clearInterval(idleInterval)
      if (watchId != null) navigator.geolocation.clearWatch(watchId)
    }
  }, [user])

  /* -------------------- LOAD PRODUCTS + DISTRIBUTORS WHEN companyId READY -------------------- */
  useEffect(() => {
    if (!companyId) return
    loadAllProducts()
    loadDistributors()
  }, [companyId])

  const loadTodayVisits = async (userId: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { count } = await supabase
      .from("shops")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId)
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())

    setTodayVisits(count || 0)
  }

  const loadDistributors = async () => {
    if (!companyId) return
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("company_id", companyId)
        .eq("role", "distributor")
        .order("full_name", { ascending: true })

      if (error) {
        console.error("loadDistributors error:", error)
        setDistributors([])
        return
      }

      console.log("Loaded distributors:", data)
      setDistributors(data || [])
    } catch (err) {
      console.error("loadDistributors failed:", err)
      setDistributors([])
    }
  }

  const loadAllProducts = async () => {
    if (!companyId) return
    setLoadingProducts(true)
    try {
      const { data: allProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .order("name")

      if (error) console.error("loadAllProducts error", error)

      setAvailableProducts(allProducts || [])
      setNewProducts(allProducts || [])
    } catch (err) {
      console.error("Failed to load products:", err)
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleLogout = async () => {
    await endSession()
    await supabase.auth.signOut()
    router.push("/")
  }

  /* -------------------- LOCATION: BEST-EFFORT + MANUAL CORRECTION -------------------- */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      })
      return
    }

    toast({
      title: t("loading"),
      description: "Detecting location...",
    })

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords

        setLatitude(lat)
        setLongitude(lon)

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          )
          const data = await response.json()

          const road = data.address.road || ""
          const area =
            data.address.suburb ||
            data.address.neighbourhood ||
            data.address.village ||
            ""
          const city =
            data.address.city ||
            data.address.town ||
            data.address.municipality ||
            data.address.state_district ||
            ""

          const simpleAddress = [road, area, city].filter(Boolean).join(", ")

          setAddress(simpleAddress || "Location detected")
          toast({
            title: "Location detected",
            description:
              simpleAddress || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          })
        } catch (error) {
          setAddress("Location detected")
          toast({
            title: "Location detected",
            description: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
          })
        }
      },
      (error) => {
        let errorMessage = "Unable to detect location. Please enable GPS."
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage =
            "Location permission denied. Please enable location access in your browser settings."
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage =
            "Location information is unavailable. Please check your GPS / network."
        } else if (error.code === error.TIMEOUT) {
          errorMessage =
            "Location request timed out. Please move near a window and try again, or enter address manually."
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 30000,
      },
    )
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelfieUrl(reader.result as string)
        toast({
          title: "Photo captured",
          description: "Shop selfie added",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const updateNewProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const newState = { ...selectedNewProducts }
      delete newState[productId]
      setSelectedNewProducts(newState)
    } else {
      setSelectedNewProducts({ ...selectedNewProducts, [productId]: quantity })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // DISTRIBUTOR VALIDATION - NEW
    if (!selectedDistributorId) {
      toast({
        title: "Error",
        description: "Please select a distributor",
        variant: "destructive",
      })
      return
    }

    if (!latitude || !longitude) {
      toast({
        title: "Error",
        description:
          "Please detect location first or enter coordinates manually",
        variant: "destructive",
      })
      return
    }

    if (!selfieUrl) {
      toast({
        title: "Error",
        description: "Please take a shop selfie",
        variant: "destructive",
      })
      return
    }

    if (productAvailable === null) {
      toast({
        title: "Error",
        description: "Please select if product is available",
        variant: "destructive",
      })
      return
    }

    if (!productAvailable && !problemType) {
      toast({
        title: "Error",
        description: "Please select the problem type",
        variant: "destructive",
      })
      return
    }

    // NEW: Validate other problem description when "other" is selected
    if (!productAvailable && problemType === "other" && !otherProblemDescription.trim()) {
      toast({
        title: "Error",
        description: "Please describe the specific problem",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)

    try {
      const { data: shopData, error: shopError } = await supabase
        .from("shops")
        .insert({
          shop_name: shopName,
          mobile_number: mobileNo,
          latitude,
          longitude,
          address,
          landmark,
          selfie_url: selfieUrl,
          product_available: productAvailable,
          problem_type: !productAvailable ? problemType : null,
          problem_description: !productAvailable && problemType === "other" ? otherProblemDescription : null, // NEW: Save description
          created_by: user.id,
          company_id: companyId,
        })
        .select()
        .single()

      if (shopError) throw shopError

      // AVAILABLE products -> store in shop_products (not orders)
      if (productAvailable) {
        const selectedIds = Object.keys(selectedAvailableProducts).filter(
          (id) => selectedAvailableProducts[id],
        )

        if (selectedIds.length > 0) {
          const rows = selectedIds
            .map((product_id) => {
              const product = availableProducts.find((p) => p.id === product_id)
              if (!product) return null
              return {
                shop_id: shopData.id,
                company_id: companyId,
                product_id,
                product_name: product.name,
                is_available: true,
                created_by: user.id,
              }
            })
            .filter(Boolean)

          if (rows.length > 0) {
            const { error: availError } = await supabase
              .from("shop_products")
              .insert(rows as any)
            if (availError) throw availError
          }
        }
      }

      // NEW products -> quantity -> orders WITH DISTRIBUTOR_ID
      for (const [product_id, quantity] of Object.entries(
        selectedNewProducts,
      )) {
        if (!quantity || quantity <= 0) continue
        const product = newProducts.find((p) => p.id === product_id)
        if (!product) continue

        await supabase.from("orders").insert({
          shop_id: shopData.id,
          product_name: product.name,
          quantity,
          status: "pending",
          created_by: user.id,
          company_id: companyId,
          distributor_id: selectedDistributorId, // NEW: distributor assignment
        })
      }

      toast({
        title: t("visitSubmitted"),
        description: "Visit recorded successfully",
      })

      // RESET FORM INCLUDING DISTRIBUTOR AND NEW FIELD
      setShopName("")
      setMobileNo("")
      setLandmark("")
      setLatitude(null)
      setLongitude(null)
      setAddress("")
      setSelfieUrl("")
      setProductAvailable(null)
      setProblemType("")
      setOtherProblemDescription("") // NEW: Reset other description
      setSelectedAvailableProducts({})
      setSelectedNewProducts({})
      setSelectedDistributorId("") // NEW: reset distributor
      setCatalogExpanded(false)
      setNewProductsExpanded(false)
      await loadTodayVisits(user.id)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit visit",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-8">
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold text-gray-900">{t("salesman")}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Today: {todayVisits} visits
            </Badge>
            <LanguageSelector />
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("checkIn")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Shop details */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shopName" className="text-base">
                    {t("shopName")}
                  </Label>
                  <Input
                    id="shopName"
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    required
                    className="mt-2 h-12 text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="mobileNo" className="text-base">
                    {t("mobileNo")}
                  </Label>
                  <Input
                    id="mobileNo"
                    type="tel"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    required
                    className="mt-2 h-12 text-base"
                  />
                </div>
                <div>
                  <Label htmlFor="landmark" className="text-base">
                    {t("landmark")}
                  </Label>
                  <Input
                    id="landmark"
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="mt-2 h-12 text-base"
                  />
                </div>

                {/* DISTRIBUTOR DROPDOWN - NEW */}
                <div>
                  <Label htmlFor="distributor" className="text-base">
                    Select Distributor <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="distributor"
                    value={selectedDistributorId}
                    onChange={(e) => setSelectedDistributorId(e.target.value)}
                    className="mt-2 h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Choose distributor...</option>
                    {distributors.map((distributor) => (
                      <option key={distributor.id} value={distributor.id}>
                        {distributor.full_name}
                      </option>
                    ))}
                  </select>

                  {distributors.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      No distributors found for this company
                    </p>
                  )}
                </div>
              </div>

              {/* Location button + coordinates preview */}
              <div>
                <Button
                  type="button"
                  onClick={detectLocation}
                  variant="outline"
                  className="h-14 w-full bg-transparent text-base"
                  disabled={!!latitude}
                >
                  <MapPin className="mr-2 h-5 w-5" />
                  {latitude ? address || "Location Detected" : t("detectLocation")}
                </Button>
                {latitude && longitude && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Detected: {latitude.toFixed(5)}, {longitude.toFixed(5)} (edit address if
                    this seems wrong)
                  </p>
                )}
              </div>

              {/* Address editable */}
              <div>
                <Label htmlFor="address" className="text-base">
                  Address (editable)
                </Label>
                <Input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-2 h-12 text-base"
                  placeholder="Edit if auto-detected address is wrong"
                />
              </div>

              {/* Photo */}
              <div>
                <Label className="text-base">{t("takeSelfie")}</Label>
                <div className="mt-2">
                  {selfieUrl ? (
                    <div className="relative">
                      <img
                        src={selfieUrl}
                        alt="Shop"
                        className="h-48 w-full rounded-lg object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelfieUrl("")}
                        className="absolute right-2 top-2"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="photo"
                      className="flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed"
                    >
                      <div className="text-center">
                        <Camera className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">{t("takeSelfie")}</p>
                      </div>
                      <input
                        id="photo"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoCapture}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Product availability */}
              <div>
                <Label className="mb-3 block text-base">{t("productAvailable")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={productAvailable === true ? "default" : "outline"}
                    onClick={() => {
                      setProductAvailable(true)
                      setProblemType("")
                      setOtherProblemDescription("") // NEW: Clear when switching to Yes
                    }}
                    className="h-14 text-base"
                  >
                    {t("yes")}
                  </Button>
                  <Button
                    type="button"
                    variant={productAvailable === false ? "destructive" : "outline"}
                    onClick={() => {
                      setProductAvailable(false)
                      setSelectedAvailableProducts({})
                      setSelectedNewProducts({})
                      setCatalogExpanded(false)
                      setNewProductsExpanded(false)
                    }}
                    className="h-14 text-base"
                  >
                    {t("no")}
                  </Button>
                </div>
              </div>

              {productAvailable === false && (
                <div>
                  <Label className="mb-3 block text-base">{t("actualProblem")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={problemType === "price_high" ? "default" : "outline"}
                      onClick={() => {
                        setProblemType("price_high")
                        setOtherProblemDescription("")
                      }}
                      className="h-14 text-sm"
                    >
                      {t("priceHigh")}
                    </Button>
                    <Button
                      type="button"
                      variant={problemType === "no_space" ? "default" : "outline"}
                      onClick={() => {
                        setProblemType("no_space")
                        setOtherProblemDescription("")
                      }}
                      className="h-14 text-sm"
                    >
                      {t("noSpace")}
                    </Button>
                    <Button
                      type="button"
                      variant={problemType === "competitor" ? "default" : "outline"}
                      onClick={() => {
                        setProblemType("competitor")
                        setOtherProblemDescription("")
                      }}
                      className="h-14 text-sm"
                    >
                      {t("competitor")}
                    </Button>
                    <Button
                      type="button"
                      variant={problemType === "other" ? "default" : "outline"}
                      onClick={() => setProblemType("other")}
                      className="h-14 text-sm"
                    >
                      {t("other")}
                    </Button>
                  </div>

                  {/* NEW: Other Problem Description Input */}
                  {problemType === "other" && (
                    <div className="mt-4">
                      <Label htmlFor="otherProblem" className="text-base">
                        Specific Problem <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="otherProblem"
                        type="text"
                        value={otherProblemDescription}
                        onChange={(e) => setOtherProblemDescription(e.target.value)}
                        placeholder="Describe the exact problem..."
                        required={problemType === "other"}
                        className="mt-2 h-12 text-base"
                        maxLength={200}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Max 200 characters
                      </p>
                    </div>
                  )}
                </div>
              )}

              {productAvailable === true && (
  <>
    {/* NEW PRODUCTS */}
    <Collapsible
      open={newProductsExpanded}
      onOpenChange={setNewProductsExpanded}
      className="mt-4"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full justify-start text-base"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          New Products to Offer ({newProducts.length})

          {Object.keys(selectedNewProducts).length > 0 && (
            <Badge className="ml-2 h-6 px-2">
              {Object.keys(selectedNewProducts).length}
            </Badge>
          )}

          <ChevronDown
            className={`ml-auto h-4 w-4 transition-transform ${
              newProductsExpanded ? "rotate-180" : ""
            }`}
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        {/* 🔽 RESTRICTED SCROLL AREA */}
        <div className="max-h-[60vh] overflow-y-auto rounded-xl border bg-gray-50 p-3">
          {loadingProducts ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : newProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No new products to offer
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {newProducts.map((product) => {
                const qty = selectedNewProducts[product.id]
                const isSelected = qty != null

                return (
                  <div
                    key={product.id}
                    className={`rounded-2xl border bg-white shadow-md transition ${
                      isSelected ? "ring-2 ring-yellow-400" : ""
                    }`}
                  >
                    {/* IMAGE */}
                    <div className="relative">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-52 w-full rounded-t-2xl object-contain bg-gray-50 p-4"
                      />

                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          updateNewProductQuantity(
                            product.id,
                            checked ? 1 : 0
                          )
                        }
                        className="absolute left-3 top-3 scale-125 bg-white shadow"
                      />
                    </div>

                    {/* CONTENT */}
                    <div className="p-4 text-center">
                      <p className="text-lg font-semibold leading-tight">
                        {product.name}
                      </p>

                      <span className="mt-2 inline-block rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        New Product
                      </span>

                      {/* COUNTER */}
                      {isSelected && (
                        <div className="mt-5 flex flex-col items-center gap-2">
                          <div className="flex items-center gap-6">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                updateNewProductQuantity(product.id, qty - 1)
                              }
                              className="h-12 w-12 rounded-full"
                            >
                              <Minus className="h-5 w-5" />
                            </Button>

                            <span className="text-2xl font-bold">
                              {qty}
                            </span>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                updateNewProductQuantity(product.id, qty + 1)
                              }
                              className="h-12 w-12 rounded-full"
                            >
                              <Plus className="h-5 w-5" />
                            </Button>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Quantity = number of packets
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  </>
)}

              <Button type="submit" disabled={submitting} className="h-14 w-full text-lg">
                {submitting ? t("loading") : t("submit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
