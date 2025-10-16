import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Suspense } from "react"
import PageTransition from "@/components/page-transition"

export const metadata: Metadata = {
  title: "Mein E.ON Login - E.ON Energie Deutschland",
  description: "Ihr persönliches Serviceportal - Mein E.ON Login",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "https://da.eon.de/s/sfsites/c/resource/CIAM_Digital_Attacker/icons/favicon16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "https://da.eon.de/s/sfsites/c/resource/CIAM_Digital_Attacker/icons/favicon32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de">
      <head>
        <link rel="stylesheet" type="text/css" href="https://web-ui.eon.com/cdn/fonts/19.0.0/index.css" />
      </head>
      <body className="font-sans antialiased">
        <Suspense fallback={<div>Loading...</div>}>
          <PageTransition>{children}</PageTransition>
        </Suspense>
      </body>
    </html>
  )
}
