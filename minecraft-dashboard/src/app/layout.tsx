import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import ClientSessionProvider from "./components/ClientSessionProvider";

export const metadata: Metadata = {
  title: "Minecraft Server Manager",
  description: "Control panel for Minecraft server management",
  icons: {
    icon: '/minecraft-dashboard/public/mc_icon.jpg'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientSessionProvider>{children}</ClientSessionProvider>
      </body>
    </html>
  );
}
