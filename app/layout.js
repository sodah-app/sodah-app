import "./globals.css";
import Providers from "./providers";

import RegisterSW from "@/components/RegisterSW";
import InstallPopup from "@/components/InstallPopup";

import {
  InstallProvider,
} from "@/components/InstallationButton";

export const metadata = {
  title: "Sodah",

  description:
    "AI-powered WhatsApp Business Automation",

  manifest:
    "/manifest.json",

  icons: {
    icon:
      "/icon-192.png",

    apple:
      "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black">

        <RegisterSW />

        <InstallProvider>

          <InstallPopup />

          <Providers>
            {children}
          </Providers>

        </InstallProvider>

      </body>
    </html>
  );
}