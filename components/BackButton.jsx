"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/welcome");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="
        fixed
        bottom-6
        left-6
        z-[9999]
        w-14
        h-14
        rounded-full
        bg-green-500
        text-white
        shadow-2xl
        flex
        items-center
        justify-center
        text-2xl
        hover:scale-110
        transition
      "
    >
      ←
    </button>
  );
}