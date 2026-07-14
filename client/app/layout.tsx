import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ACETRACK 3.0 – Empowering Student Organizations",
  description:
    "ACETRACK 3.0 helps students manage members, events, and activities in one place. The modern school organization management platform.",
  keywords: "school organization, student management, events, ACETRACK 3.0",
  openGraph: {
    title: "ACETRACK 3.0",
    description: "Empowering Student Organizations to Stay Organized and Connected",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.className} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
