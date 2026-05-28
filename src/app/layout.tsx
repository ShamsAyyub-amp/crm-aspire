import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/nav";
import { getCurrentUser, listUsers } from "@/lib/user";

export const metadata: Metadata = {
  title: "crm-aspire",
  description: "Sales CRM where Claude is the product, not just the builder.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [me, users] = await Promise.all([getCurrentUser(), listUsers()]);
  return (
    <html lang="en">
      <body>
        <Nav me={me} users={users} />
        <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
