"use client"

import { LanguageProvider } from "@/lib/language-context"
import { Toaster } from "@/components/ui/toaster"
import PWARegister from "@/components/PWARegister"

export default function Providers({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LanguageProvider>
      <PWARegister />
      {children}
      <Toaster />
    </LanguageProvider>
  )
}
