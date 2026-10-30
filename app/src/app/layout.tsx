import type { Metadata } from "next";
import { Inter, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-manrope" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jbmono" });

export const metadata: Metadata = {
  title: "CreatorTips · Tip by Handle",
  description: "Tip BOT Chain creators by handle — live on BOT Chain mainnet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable} ${mono.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
