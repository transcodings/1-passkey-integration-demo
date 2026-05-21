import { DemoToastProvider } from "@/components/DemoToastProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DemoSiteMetadataString } from "@/constants";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { themeBootstrapInlineScript } from "@/themeBootstrapInline";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: DemoSiteMetadataString.FullTitle,
  description: DemoSiteMetadataString.Description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: themeBootstrapInlineScript(),
          }}
        />
      </head>
      <body className="relative min-h-full flex flex-col">
        <ThemeProvider>
          <DemoToastProvider>
            <div className="pointer-events-none fixed right-4 top-4 z-50 md:right-6 md:top-6">
              <div className="pointer-events-auto">
                <ThemeToggle />
              </div>
            </div>
            {children}
          </DemoToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
