import { Suspense } from "react";
import ConnectWhatsAppClient from "./ConnectWhatsAppClient";

export const dynamic = "force-dynamic";

export default function ConnectWhatsAppPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConnectWhatsAppClient />
    </Suspense>
  );
}