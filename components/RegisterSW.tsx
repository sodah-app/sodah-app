"use client";

import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          console.log("SW Registered");
        })
        .catch(console.error);
    }

    window.addEventListener(
      "beforeinstallprompt",
      (e) => {
        console.log(
          "INSTALL READY",
          e
        );
      }
    );
  }, []);

  return null;
}