import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NACOS Skills Hub — Peer-to-Peer Tech Mentorship for Nigerian Students",
  description:
    "Find the mentor who's already where you're trying to go. Peer mentorship, AI-driven skill discovery, and project-based milestones tailored for Nigerian Computer Science students.",
  keywords: [
    "NACOS",
    "NACOS ABUAD",
    "Nigerian Computer Science",
    "Tech Mentorship",
    "Skill Discovery",
    "Student Developers Nigeria",
    "Peer Learning",
    "Mobile Development",
    "Cybersecurity",
    "Frontend",
    "Backend",
    "UI/UX",
    "SQL",
    "Fullstack",
    "DevOps",
  ],
  authors: [{ name: "NACOS Skills Hub Initiative" }],
  openGraph: {
    title: "NACOS Skills Hub — Peer-to-Peer Tech Mentorship",
    description:
      "Get matched to a skill, a structured learning path, and a verified senior student or alumni mentor who'll guide you step-by-step.",
    siteName: "NACOS Skills Hub",
    locale: "en_NG",
    type: "website",
  },
  icons: {
    icon: "/images/nacoslogo.png",
    apple: "/images/nacoslogo.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#16452E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-paper text-ink flex flex-col font-body selection:bg-forest selection:text-paper">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
