import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/nav";
import CommandPalette from "@/components/command-palette";
import { ToasterProvider } from "@/components/toaster";
import { getCurrentUser, listUsers } from "@/lib/user";

export const metadata: Metadata = {
  title: "Pipelytics — Your AI sales coach",
  description: "The CRM that makes a sales rep's life easy. Your AI sales coach reads the pipeline, tells you what to do next, and drafts the work.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [me, users] = await Promise.all([getCurrentUser(), listUsers()]);
  return (
    <html lang="en">
      <body>
        <ToasterProvider>
          <Nav me={me} users={users} />
          <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
          <CommandPalette />
        </ToasterProvider>
      </body>
    </html>
  );
}
