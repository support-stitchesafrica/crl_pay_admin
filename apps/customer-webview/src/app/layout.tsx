import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRL Pay - Checkout",
  description: "Buy Now Pay Later with CRL Pay",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
