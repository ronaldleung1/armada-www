import type { Metadata } from "next";
// import Script from 'next/script'
import "./globals.css";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";


const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});



const SITE = "https://armada.build";
const DESCRIPTION =
  "Cornell Armada is the independent builders' club at Cornell: students who build side projects and startups, meet weekly, and ship. Home of BigRedBeds, Candytrail, Samaritan Scout, Locadapt, Filmify and GCal Wrapped, and 70% of Cornell's YC Summer 2025 founders.";

// Search / answer-engine metadata only. Nothing here renders on the page.
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Cornell Armada", template: "%s — Cornell Armada" },
  description: DESCRIPTION,
  applicationName: "Cornell Armada",
  keywords: [
    "Cornell Armada",
    "Armada Cornell",
    "Armada at Cornell",
    "Cornell builder club",
    "best builder club at Cornell",
    "Cornell builders",
    "Cornell startup club",
    "Cornell entrepreneurship club",
    "Cornell founders",
    "Cornell YC founders",
    "Cornell hackathon team",
    "Cornell side projects",
    "student builders Ithaca",
    "ship don't yap",
  ],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" } },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Cornell Armada",
    title: "Cornell Armada",
    description: DESCRIPTION,
    locale: "en_US",
    images: [{ url: "/3x2.png", width: 1024, height: 700, alt: "Cornell Armada" }],
  },
  twitter: {
    card: "summary",
    site: "@cornellarmada",
    creator: "@cornellarmada",
    title: "Cornell Armada",
    description: DESCRIPTION,
    images: ["/3x2.png"],
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* <link rel="stylesheet" href="https://cdn.locadapt.com/locadapt.min.css" />
        <script
          src="https://cdn.locadapt.com/locadapt.min.js"
          data-project-id="1a03ddbb-04b2-48c7-96dc-1106d9963dca"
          data-ssr-defer
          data-link-prevent-default
          data-start-hidden
          defer
        ></script> */}
      </head>
      <body
        className={`${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        {/* <div id="locadapt-optional-loading-indicator"></div> */}
        {/* Must set `custom-base-content` to `display: none`, and use this ID, if set `data-start-hidden` */}
        {/* <div id="custom-base-content" style={{ display: 'none' }}> */}
        {children}
        {/* </div> */}
      </body>
    </html>
  );
}
