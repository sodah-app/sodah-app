export function isInAppBrowser() {
  if (typeof window === "undefined")
    return false;

  const ua =
    navigator.userAgent.toLowerCase();

  return (
    ua.includes("instagram") ||
    ua.includes("fban") ||
    ua.includes("fbav") ||
    ua.includes("facebook") ||
    ua.includes("messenger") ||
    ua.includes("whatsapp") ||
    ua.includes("tiktok") ||
    ua.includes("telegram") ||
    ua.includes("linkedin") ||
    ua.includes("snapchat") ||
    ua.includes("wechat") ||
    ua.includes("line")
  );
}

export function isStandalonePWA() {
  if (typeof window === "undefined")
    return false;

  return (
    window.matchMedia(
      "(display-mode: standalone)"
    ).matches ||
    (window.navigator as any)
      .standalone === true
  );
}

export function shouldHideGoogleLogin() {
  return (
    isInAppBrowser() ||
    isStandalonePWA()
  );
}