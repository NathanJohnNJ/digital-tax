import "./globals.css";
import { Geologica, Poppins, Inter } from 'next/font/google';
import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import SideNav from './components/ui/sidenav';
import Cookies from './components/Cookies';
import Head from 'next/head';

const geologica = Geologica({
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  weight: 'variable',
  subsets: ['latin'],
  axes: [
    'CRSV',
    'SHRP',
    'slnt'
  ],
  variable: "--font-geologica"
})

const poppins = Poppins({
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: "--font-poppins"
})

const inter = Inter({
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Digital Tax by NJTD",
  description: "Digital Tax app brought to you by NJTD to ease the transition of Making Tax Digital with HMRC.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" className={`${geologica.variable} ${poppins.variable} ${inter.className}`}>
      <Head>
        <title>Digital Tax by NJTD</title>
      </Head>
      <body>
        <main className="h-screen w-screen bg-linear-300 from-zinc-400/70 to-white overflow-hidden relative">
          <Auth0Provider>
            <div className="flex h-screen w-screen">
              <SideNav />
              <div className="flex flex-col items-center justify-center w-full h-full">
                {children}
              </div>
            </div>
          </Auth0Provider>
          <Cookies />
        </main>
      </body>
    </html>
  )
}