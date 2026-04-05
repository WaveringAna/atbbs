import { escapeHtml, relativeDate, getData } from "../lib/util";
import { createPaginatedLoader } from "../lib/pagination";

interface InboxItem {
  type: string;
  thread_title: string;
  thread_uri: string;
  handle: string;
  body: string;
  created_at: string;
  bbs_handle: string;
}

function initTabs() {
  const panels = ["inbox", "bbs"];

  document.querySelectorAll<HTMLElement>(".tab-btn[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.tab!;

      document.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.remove("text-neutral-200", "border-neutral-200");
        b.classList.add("text-neutral-500", "border-transparent");
      });
      btn.classList.remove("text-neutral-500", "border-transparent");
      btn.classList.add("text-neutral-200", "border-neutral-200");

      for (const p of panels) {
        document.getElementById(`panel-${p}`)?.classList.toggle("hidden", p !== name);
      }
    });
  });
}

export function initAccount() {
  initTabs();

  const handle = getData("inbox", "handle");

  createPaginatedLoader<InboxItem>({
    fetchUrl: (cursor) => {
      let url = "/api/inbox";
      if (cursor) url += `?cursor=${encodeURIComponent(cursor)}`;
      return url;
    },
    containerId: "inbox",
    loadingId: "inbox-loading",
    nextContainerId: "inbox-next",
    loadMoreId: "load-more",
    dataKey: "inbox",
    emptyMessage: "No messages yet.",
    renderItem: (m) => {
      const parts = m.thread_uri.split("/");
      const threadDid = parts[2];
      const threadRkey = parts[parts.length - 1];

      const el = document.createElement("a");
      el.href = `/bbs/${handle}/thread/${threadDid}/${threadRkey}`;
      el.className =
        "block border border-neutral-800/50 rounded p-4 mb-2 hover:bg-neutral-900";
      const label =
        m.type === "quote"
          ? "quoted your reply"
          : "on: " + escapeHtml(m.thread_title);
      el.innerHTML = `<div class="flex items-baseline justify-between mb-1"><span class="text-neutral-300">${escapeHtml(m.handle)}</span><span class="text-xs text-neutral-500">${relativeDate(m.created_at)}</span></div><p class="text-xs text-neutral-500 mb-1">${label}</p><p class="text-neutral-400">${escapeHtml(m.body)}</p>`;
      return el;
    },
  });
}
