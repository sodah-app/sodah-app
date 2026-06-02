import "./globals.css";

export const metadata = {
  title: "Soda.io",
  description: "Soda.io - AI-powered WhatsApp automation platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white text-black">
        {children}
      </body>
    </html>
  );
}