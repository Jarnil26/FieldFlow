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
import { Camera, MapPin, LogOut, Plus, Minus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SalesmanPage() {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

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
  const [productName, setProductName] = useState("")
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login?role=salesman")
        return
      }
      setUser(user)

      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single()

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
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

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
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`,
          )
          const data = await response.json()
          const simpleAddress = `${data.address.suburb || data.address.neighbourhood || ""}, ${data.address.city || data.address.town || ""}`
          setAddress(simpleAddress.trim())
          toast({
            title: "Location detected",
            description: simpleAddress,
          })
        } catch (error) {
          setAddress("Location detected")
          toast({
            title: "Location detected",
            description: "Coordinates saved",
          })
        }
      },
      (error) => {
        let errorMessage = "Unable to detect location. Please enable GPS."
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = "Location permission denied. Please enable location access in your browser settings."
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location information is unavailable. Please check your GPS settings."
        } else if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out. Please try again."
        }
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!latitude || !longitude) {
      toast({
        title: "Error",
        description: "Please detect location first",
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

    if (productAvailable && !productName) {
      toast({
        title: "Error",
        description: "Please enter product name for order",
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
          created_by: user.id,
          company_id: companyId,
        })
        .select()
        .single()

      if (shopError) throw shopError

      if (productAvailable && productName) {
        const { error: orderError } = await supabase.from("orders").insert({
          shop_id: shopData.id,
          product_name: productName,
          quantity,
          created_by: user.id,
          company_id: companyId,
        })

        if (orderError) throw orderError
      }

      toast({
        title: t("visitSubmitted"),
        description: "Visit recorded successfully",
      })

      setShopName("")
      setMobileNo("")
      setLandmark("")
      setLatitude(null)
      setLongitude(null)
      setAddress("")
      setSelfieUrl("")
      setProductAvailable(null)
      setProblemType("")
      setProductName("")
      setQuantity(1)
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
              {/* Shop Details */}
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
              </div>

              {/* Location Detection */}
              <div>
                <Button
                  type="button"
                  onClick={detectLocation}
                  variant="outline"
                  className="h-14 w-full text-base bg-transparent"
                  disabled={!!latitude}
                >
                  <MapPin className="mr-2 h-5 w-5" />
                  {latitude ? address || "Location Detected" : t("detectLocation")}
                </Button>
              </div>

              {/* Photo Capture */}
              <div>
                <Label className="text-base">{t("takeSelfie")}</Label>
                <div className="mt-2">
                  {selfieUrl ? (
                    <div className="relative">
                      <img
                        src={selfieUrl || "/placeholder.svg"}
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

              {/* Product Availability */}
              <div>
                <Label className="mb-3 block text-base">{t("productAvailable")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={productAvailable === true ? "default" : "outline"}
                    onClick={() => {
                      setProductAvailable(true)
                      setProblemType("")
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
                      setProductName("")
                    }}
                    className="h-14 text-base"
                  >
                    {t("no")}
                  </Button>
                </div>
              </div>

              {/* If Product Not Available - Problem Selection */}
              {productAvailable === false && (
                <div>
                  <Label className="mb-3 block text-base">{t("actualProblem")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={problemType === "price_high" ? "default" : "outline"}
                      onClick={() => setProblemType("price_high")}
                      className="h-14 text-sm"
                    >
                      {t("priceHigh")}
                    </Button>
                    <Button
                      type="button"
                      variant={problemType === "no_space" ? "default" : "outline"}
                      onClick={() => setProblemType("no_space")}
                      className="h-14 text-sm"
                    >
                      {t("noSpace")}
                    </Button>
                    <Button
                      type="button"
                      variant={problemType === "competitor" ? "default" : "outline"}
                      onClick={() => setProblemType("competitor")}
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
                </div>
              )}

              {/* If Product Available - Place Order */}
              {productAvailable === true && (
                <div className="space-y-4 rounded-lg border bg-green-50 p-4">
                  <Label className="text-base font-semibold">{t("placeOrder")}</Label>
                  <div>
                    <Label htmlFor="productName" className="text-sm">
                      {t("productName")}
                    </Label>
                    <Input
                      id="productName"
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="mt-2 h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">{t("quantity")}</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-12 w-12"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="min-w-[3rem] text-center text-2xl font-semibold">{quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="h-12 w-12"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
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
