import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "http://localhost:3000"),
  title: {
    default: "RYDEX - Book Any Vehicle",
    template: "%s · RYDEX",
  },
  description:
    "RYDEX is a multi-vendor vehicle booking marketplace. Book bikes, cars, autos, loading vehicles and trucks from verified local partners.",
  openGraph: {
    title: "RYDEX - Book Any Vehicle",
    description: "Bikes, cars, autos, loading vehicles and trucks from verified partners.",
    images: ["/heroImage.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} data-scroll-behavior="smooth">
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
