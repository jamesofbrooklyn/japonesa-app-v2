import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Japonesa — Executive Dashboard",
  description: "Carbone-style ops command center for Japonesa Poblacion.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 max-w-[1400px]">{children}</main>
        </div>
      </body>
    </html>
  );
}
