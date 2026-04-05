import { relativeDate, formatFullDate } from "../lib/util";

export function initLocaltime() {
  document.querySelectorAll<HTMLElement>(".localtime").forEach((el) => {
    const iso = el.getAttribute("datetime");
    if (!iso) return;
    el.textContent = relativeDate(iso);
    el.setAttribute("title", formatFullDate(iso));
  });
}
