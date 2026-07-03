/**
 * Entry point for the floating chat widget. Any "Messages" button on
 * desktop should call openChatWidget() instead of navigating to the
 * full-page /messages (which stays for mobile and the expand button).
 */
export const OPEN_CHAT_EVENT = "sh:open-chat";

export const openChatWidget = (chatId?: string) => {
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { chatId } }));
};

/** true when the viewport uses the desktop layout (lg breakpoint) */
export const isDesktopViewport = () =>
  typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
