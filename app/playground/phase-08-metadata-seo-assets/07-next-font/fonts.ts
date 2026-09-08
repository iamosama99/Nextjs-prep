import { Inter } from "next/font/google";
import localFont from "next/font/local";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const robotoMono = localFont({
  src: "./fonts/RobotoMono-Regular.woff2",
  display: "swap",
  variable: "--font-roboto-mono",
  weight: "400",
  style: "normal",
});
