import type { Metadata } from "next";
import ThemeRegistry from "@/components/ThemeRegistry";
import { LocaleProvider } from "@/components/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Admin Dashboard - Marketplace",
  description: "Admin panel for marketplace management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
