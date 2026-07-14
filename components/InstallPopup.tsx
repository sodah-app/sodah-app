"use client";

import { useState } from "react";
import { useInstall } from "./InstallationButton";

export default function InstallPopup() {
  const { installApp, canInstall } =
    useInstall();

  const [open, setOpen] =
    useState(true);

  if (!open) return null;

  const isFirefox =
    typeof navigator !== "undefined" &&
    navigator.userAgent.includes(
      "Firefox"
    );

  return (
    <div
      className="
      fixed inset-0
      bg-black/60
      flex items-center
      justify-center
      z-[99999]
      px-4
    "
    >
      <div
        className="
        bg-white
        p-6
        rounded-2xl
        w-full
        max-w-[340px]
        text-center
      "
      >
        <div className="text-5xl mb-4">
          📲
        </div>

        <h2 className="font-bold text-2xl">
          Install Sodah
        </h2>

        {isFirefox ? (
          <>
            <p className="mt-3 text-gray-600">
              Firefox does not support
              automatic installation.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Use:
              <br />
              ☰ Menu → Install
            </p>
          </>
        ) : (
          <p className="mt-3 text-gray-600">
            Install the app for
            faster access.
          </p>
        )}

        {!isFirefox &&
          canInstall && (
            <button
              onClick={
                installApp
              }
              className="
              mt-6
              bg-green-500
              text-white
              px-6
              py-3
              rounded-xl
              w-full
            "
            >
              Install App
            </button>
          )}

        <button
          onClick={() =>
            setOpen(false)
          }
          className="
            mt-3
            border
            border-gray-300
            px-6
            py-3
            rounded-xl
            w-full
            hover:bg-gray-100
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}