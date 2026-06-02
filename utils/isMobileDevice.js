export const isMobileDevice = () => {
  if (typeof window === "undefined") return false;

  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
    navigator.userAgent
  );
};