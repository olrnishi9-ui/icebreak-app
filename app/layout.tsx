import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Icebreak", description: "A first hello, at your next event." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
