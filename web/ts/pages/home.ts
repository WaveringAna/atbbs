import { escapeHtml } from "../lib/util";
import { fetchJson } from "../lib/api";

interface DiscoverBBS {
  handle: string;
  name: string;
  description: string;
}

export function initHome() {
  const form = document.getElementById("handle-form") as HTMLFormElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.elements.namedItem("handle") as HTMLInputElement;
    const handle = input.value.trim();
    if (handle) window.location.href = "/bbs/" + encodeURIComponent(handle);
  });

  fetchJson<{ bbses: DiscoverBBS[] }>("/api/discover")
    .then((data) => {
      if (!data.bbses?.length) return;
      const list = document.getElementById("discover-list");
      if (!list) return;

      for (const bbs of data.bbses) {
        const a = document.createElement("a");
        a.href = "/bbs/" + encodeURIComponent(bbs.handle);
        a.className =
          "flex items-baseline gap-3 px-3 py-2 -mx-3 rounded hover:bg-neutral-900 group";
        a.innerHTML = `<span class="text-neutral-200 group-hover:text-white">${escapeHtml(bbs.name || bbs.handle)}</span><span class="text-neutral-500">${escapeHtml(bbs.description)}</span>`;
        list.appendChild(a);
      }

      document.getElementById("discover")?.classList.remove("hidden");
    })
    .catch(() => {});
}
