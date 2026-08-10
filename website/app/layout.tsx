import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Necktie — Follow the money";
const description =
  "An opinionated policy for AI agents that tests incentives, metrics, power, extraction, and hidden costs—then takes a side.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const metadataBase = safeMetadataBase(
    forwardedHost,
    requestHeaders.get("x-forwarded-proto"),
  );

  return {
    metadataBase,
    title,
    description,
    applicationName: "Necktie",
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/favicon.svg", type: "image/svg+xml" },
      ],
      apple: "/apple-touch-icon.png",
    },
    openGraph: {
      type: "website",
      title,
      description,
      siteName: "Necktie",
      images: [{ url: "/og.png", width: 1729, height: 910, alt: "Necktie — follow the money" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

function safeMetadataBase(hostHeader: string, protocolHeader: string | null) {
  const host = hostHeader.split(",", 1)[0].trim();
  const validHost =
    /^(?:localhost|\[[0-9a-f:]+\]|[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?)(?::\d{1,5})?$/i;
  if (!validHost.test(host)) return new URL("http://localhost:3000");

  const requestedProtocol = protocolHeader?.split(",", 1)[0].trim();
  const protocol =
    requestedProtocol === "http" || requestedProtocol === "https"
      ? requestedProtocol
      : host.startsWith("localhost")
        ? "http"
        : "https";

  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#11100e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
