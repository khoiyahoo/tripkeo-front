/** Màn hình điện thoại (dưới breakpoint md của Tailwind). */
export const isSmallScreen = (): boolean =>
  window.matchMedia("(max-width: 767px)").matches;
