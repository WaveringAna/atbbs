import { escapeHtml, relativeDate, getData } from "../lib/util";
import { createPaginatedLoader } from "../lib/pagination";

interface ThreadItem {
  uri: string;
  did: string;
  rkey: string;
  handle: string;
  title: string;
  body: string;
  created_at: string;
}

export function initBoard() {
  const handle = getData("threads", "handle");
  const slug = getData("threads", "slug");

  createPaginatedLoader<ThreadItem>({
    fetchUrl: (cursor) => {
      let url = `/api/threads/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
      if (cursor) url += `?cursor=${encodeURIComponent(cursor)}`;
      return url;
    },
    containerId: "threads",
    loadingId: "threads-loading",
    nextContainerId: "threads-next",
    loadMoreId: "load-more",
    dataKey: "threads",
    emptyMessage: "No threads yet.",
    renderItem: (t) => {
      const a = document.createElement("a");
      a.href = `/bbs/${handle}/thread/${t.did}/${t.rkey}`;
      a.className =
        "flex items-baseline justify-between gap-4 px-3 py-2.5 -mx-3 rounded hover:bg-neutral-900 group";
      a.innerHTML = `<span class="text-neutral-300 group-hover:text-white truncate">${escapeHtml(t.title)}</span><span class="shrink-0 text-xs text-neutral-500">${escapeHtml(t.handle)} · ${relativeDate(t.created_at)}</span>`;
      return a;
    },
  });
}
