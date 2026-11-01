import type { Metadata } from "next";
import Experience from "./experience";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepClub | Show up. Move up.",
  description: "Your campus gym, your people. Build consistency with private squads and staff-verified attendance.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var p=localStorage.getItem("repclub-theme"),t=p==="light"?"light":p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):"dark";document.documentElement.dataset.theme=t}catch(e){}})()` }} />
      </head>
      <body className="antialiased"><Experience>{children}</Experience></body>
    </html>
  );
}
