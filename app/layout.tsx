import "./globals.css";
import { Geologica, Poppins, Inter } from 'next/font/google';
import type { Metadata } from "next";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import SideNav from './components/ui/sidenav';

const geologica = Geologica({
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
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: "--font-poppins"
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Auth0 Next.js App",
  description: "Next.js app with Auth0 authentication",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (
    <html lang="en" className={`${geologica.variable} ${poppins.variable} ${inter.className}`}>
      <body>
        <main className="h-screen w-screen bg-linear-20 from-zinc-400/70 to-white">
          <Auth0Provider>
            <div className="flex h-screen w-screen">
              <SideNav />
              <div className="flex items-start justify-center w-full h-full">
                {children}
              </div>
            </div>
          </Auth0Provider>
        </main>
      </body>
    </html>
  )
}