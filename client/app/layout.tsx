import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrgWeb Organization – Empowering Student Organizations",
  description:
    "OrgWeb Organization helps students manage members, events, and activities in one place. The modern school organization management platform.",
  keywords: "school organization, student management, events, OrgWeb",
  openGraph: {
    title: "OrgWeb Organization",
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
      <body>{children}</body>
    </html>
  );
}
