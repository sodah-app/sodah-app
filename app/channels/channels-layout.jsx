import "../globals.css";

export const metadata = {
  title: "Sodah.io",
  description: "Sodah.io AI Business Workspace",
};

export default function ChannelsLayout({ children }) {
  return (
    <section className="min-h-screen bg-[#07110d] text-white">
      {children}
    </section>
  );
}
