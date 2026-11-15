import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "MeetMates",
  description: "Explore Broadly. Connect Deeply.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
