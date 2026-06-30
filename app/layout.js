import "./globals.css";
import Providers from "./providers";
import RegisterSW from "@/components/RegisterSW";
import InstallPopup from "@/components/InstallPopup";

export const metadata = {
  title: "Sodah",
  description: "AI-powered WhatsApp Business Automation",

  manifest: "/manifest.json",

  themeColor: "#0B1F1A",

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-black">
        <RegisterSW />
        <InstallPopup />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}