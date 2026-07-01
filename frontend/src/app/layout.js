import "./globals.css";
import Providers from "@/providers/Providers";
import Navbar from "@/components/layout/Navbar";

import Footer from "@/components/layout/Footer";

export const metadata = {
  title: "CubeVision AI — Rubik's Cube Platform",
  description: "Production-grade Rubik's Cube platform with computer vision, 3D visualization, algorithmic solving, gamification, and learning tools.",
  keywords: ["rubik's cube", "solver", "computer vision", "3D cube", "AI", "learning"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <Providers>
          <Navbar />
          <main className="pt-16 pb-16 flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
