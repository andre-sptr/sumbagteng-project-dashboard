// Root layout with global providers and font configurations
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "Sumbagteng Projects Dashboard | SLA Project Tracking",
  description: "Sistem pelacakan durasi perubahan status SLA project Sumbagteng. Dashboard lengkap dengan riwayat, pencarian, dan sinkronisasi data real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-full flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
