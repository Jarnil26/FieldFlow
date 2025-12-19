"use client"

import { useEffect, useRef } from "react"

interface Shop {
  id: string
  shop_name: string
  latitude: number
  longitude: number
  address: string
  product_available: boolean
  problem_type: string | null
}

interface MapViewProps {
  shops: Shop[]
}

export default function MapView({ shops }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    // Dynamically load Leaflet CSS and JS
    const loadLeaflet = async () => {
      // Load CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link")
        link.id = "leaflet-css"
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        document.head.appendChild(link)
      }

      // Load JS
      if (!(window as any).L) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = () => resolve()
          document.head.appendChild(script)
        })
      }

      const L = (window as any).L

      // Initialize map only once
      if (!mapInstanceRef.current && mapRef.current) {
        // Default center (India)
        const defaultCenter: [number, number] = [23.0225, 72.5714] // Ahmedabad, Gujarat

        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, 12)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current)
      }

      // Clear existing markers
      if (mapInstanceRef.current) {
        mapInstanceRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            mapInstanceRef.current.removeLayer(layer)
          }
        })

        // Add markers for each shop
        shops.forEach((shop) => {
          const icon = L.divIcon({
            html: `<div style="background-color: ${shop.product_available ? "#22c55e" : "#ef4444"}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
            className: "",
            iconSize: [24, 24],
          })

          const marker = L.marker([shop.latitude, shop.longitude], { icon }).addTo(mapInstanceRef.current)

          const popupContent = `
            <div style="min-width: 200px;">
              <h3 style="font-weight: bold; margin-bottom: 8px;">${shop.shop_name}</h3>
              <p style="margin-bottom: 4px; font-size: 14px;">${shop.address}</p>
              <p style="margin-top: 8px;">
                <span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; ${shop.product_available ? "background-color: #dcfce7; color: #166534;" : "background-color: #fee2e2; color: #991b1b;"}">
                  ${shop.product_available ? "Product Available" : `Rejected: ${shop.problem_type || "Unknown"}`}
                </span>
              </p>
            </div>
          `

          marker.bindPopup(popupContent)
        })

        // Fit bounds to show all markers
        if (shops.length > 0) {
          const bounds = L.latLngBounds(shops.map((shop) => [shop.latitude, shop.longitude]))
          mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
        }
      }
    }

    loadLeaflet()

    return () => {
      // Cleanup map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [shops])

  return <div ref={mapRef} className="h-[500px] w-full rounded-lg" />
}
