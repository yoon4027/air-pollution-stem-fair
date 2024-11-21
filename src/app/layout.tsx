import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: `Air Quality | yoon.dev`,
  description: "Various air quality data from ESP32's from different locations",
  authors: [
    {
      name: "Yoon",
    },
  ],
  openGraph: {
    title: `Air Quality | yoon.dev`,
    type: "website",
    url: `https://air.yoon.dev`,
    description:
      "Various air quality data from ESP32's from different locations",
    alternateLocale: "https://air.yoon.dev",
  },
  keywords: [
    "Air Quality Maldives",
    "air yoon",
    "dev yoon air",
    "air quality aminiya school",
    "air yoon dev",
  ],
  metadataBase: new URL("https://air.yoon.dev/"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider> */}

        {children}
      </body>
    </html>
  );
}
