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

export const metadata: Metadata = {
  title: "Armada",
  description: "We ship.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
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
