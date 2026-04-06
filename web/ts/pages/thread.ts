import { escapeHtml, relativeDate, formatFullDate, getData } from "../lib/util";
import { fetchJson } from "../lib/api";
import { REPLY } from "../lib/lexicon";

interface Attachment {
  file: { ref: { $link: string } };
  name: string;
}

interface ReplyItem {
  uri: string;
  did: string;
  rkey: string;
  handle: string;
  pds_url: string;
  body: string;
  created_at: string;
  attachments: Attachment[];
  quote: string | null;
}

const allReplies: Record<string, ReplyItem> = {};

// --- Quote UI ---

function quoteReply(uri: string, handle: string) {
  const quoteUri = document.getElementById("quote-uri") as HTMLInputElement | null;
  const previewText = document.getElementById("quote-preview-text");
  if (quoteUri) quoteUri.value = uri;
  if (previewText) previewText.textContent = `quoting ${handle}`;
  document.getElementById("quote-preview")?.classList.remove("hidden");
  (document.getElementById("reply-body") as HTMLTextAreaElement | null)?.focus();
}

function clearQuote() {
  (document.getElementById("quote-uri") as HTMLInputElement | null)!.value = "";
  document.getElementById("quote-preview")?.classList.add("hidden");
}

// --- Render helpers ---

function renderActions(
  r: ReplyItem,
  userDid: string,
  sysopDid: string,
  handle: string,
  threadDid: string,
  threadTid: string,
): string {
  const actions: string[] = [];

  if (userDid) {
    actions.push(
      `<button type="button" class="quote-btn text-xs text-neutral-500 hover:text-neutral-300" data-uri="${r.uri}" data-handle="${escapeHtml(r.handle)}">quote</button>`,
    );
  }
  if (userDid && userDid === r.did) {
    actions.push(
      `<form method="post" action="/bbs/${handle}/thread/${threadDid}/${threadTid}/reply/${r.rkey}/delete" class="inline" onsubmit="return confirm('Delete this reply?')"><button type="submit" class="text-xs text-neutral-500 hover:text-red-400">delete</button></form>`,
    );
  }
  if (userDid && userDid === sysopDid && userDid !== r.did) {
    actions.push(
      `<form method="post" action="/bbs/${handle}/ban/${r.did}" class="inline" onsubmit="return confirm('Ban this user from your BBS?')"><button type="submit" class="text-xs text-neutral-500 hover:text-red-400">ban</button></form>`,
    );
  }
  if (userDid && userDid === sysopDid) {
    actions.push(
      `<form method="post" action="/bbs/${handle}/hide" class="inline" onsubmit="return confirm('Hide this post?')"><input type="hidden" name="uri" value="${r.uri}"><button type="submit" class="text-xs text-neutral-500 hover:text-red-400">hide</button></form>`,
    );
  }

  if (!actions.length) return "";
  return `<span class="reply-actions flex items-center gap-3">${actions.join(" ")}</span>`;
}

function renderQuoteBlock(r: ReplyItem): string {
  if (!r.quote || !allReplies[r.quote]) return "";
  const q = allReplies[r.quote];
  const preview = q.body.substring(0, 200) + (q.body.length > 200 ? "..." : "");
  return `<div class="border-l-2 border-neutral-700 pl-3 mb-3 py-1 text-sm text-neutral-500"><span class="text-neutral-400">${escapeHtml(q.handle)}:</span> ${escapeHtml(preview)}</div>`;
}

function renderAttachments(r: ReplyItem): string {
  return (r.attachments || [])
    .map(
      (a) =>
        `<a href="${r.pds_url}/xrpc/com.atproto.sync.getBlob?did=${r.did}&cid=${a.file.ref["$link"]}" target="_blank" class="text-xs text-neutral-500 hover:text-neutral-300 block mt-1">[${escapeHtml(a.name)}]</a>`,
    )
    .join("");
}

function renderReply(
  r: ReplyItem,
  handle: string,
  threadDid: string,
  threadTid: string,
  userDid: string,
  sysopDid: string,
): string {
  return `<div class="reply-card border border-neutral-800/50 rounded p-4">
    <div class="flex items-baseline justify-between mb-2">
      <div class="flex items-baseline gap-2">
        <span class="text-neutral-300">${escapeHtml(r.handle)}</span>
        <span class="text-neutral-600">&middot;</span>
        <span class="text-xs text-neutral-500" title="${formatFullDate(r.created_at)}">${relativeDate(r.created_at)}</span>
      </div>
      ${renderActions(r, userDid, sysopDid, handle, threadDid, threadTid)}
    </div>
    ${renderQuoteBlock(r)}
    <p class="text-neutral-400 whitespace-pre-wrap leading-relaxed">${escapeHtml(r.body)}</p>
    ${renderAttachments(r)}
  </div>`;
}

// --- Data loading ---

interface RepliesResponse {
  replies: ReplyItem[];
  page: number;
  total_pages: number;
  total_replies: number;
}

function buildPageNav(
  current: number,
  total: number,
  goToPage: (page: number) => void,
): HTMLElement {
  const nav = document.createElement("div");
  nav.className = "flex items-center justify-center gap-2 text-sm w-full";

  function addBtn(label: string, page: number | null, active = false) {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (active) {
      btn.className = "text-neutral-200 bg-neutral-800 rounded px-3 py-1";
    } else if (page !== null) {
      btn.className = "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded px-3 py-1";
      btn.addEventListener("click", () => goToPage(page));
    } else {
      btn.className = "text-neutral-600 px-2 py-1 cursor-default";
      btn.disabled = true;
    }
    nav.appendChild(btn);
  }

  // Prev
  if (current > 1) addBtn("←", current - 1);

  // Page numbers: show window of 5 around current
  const windowSize = 2;
  let start = Math.max(1, current - windowSize);
  let end = Math.min(total, current + windowSize);

  // Ensure at least 5 pages shown if available
  if (end - start < 4) {
    if (start === 1) end = Math.min(total, start + 4);
    else if (end === total) start = Math.max(1, end - 4);
  }

  if (start > 1) {
    addBtn("1", 1);
    if (start > 2) addBtn("...", null);
  }

  for (let i = start; i <= end; i++) {
    addBtn(String(i), i, i === current);
  }

  if (end < total) {
    if (end < total - 1) addBtn("...", null);
    addBtn(String(total), total);
  }

  // Next
  if (current < total) addBtn("→", current + 1);

  return nav;
}

function updateNavs(
  current: number,
  total: number,
  goToPage: (page: number) => void,
) {
  for (const id of ["replies-nav-top", "replies-nav-bottom"]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.innerHTML = "";
    el.appendChild(buildPageNav(current, total, goToPage));
    el.classList.remove("hidden");
  }
}

function hideNavs() {
  for (const id of ["replies-nav-top", "replies-nav-bottom"]) {
    document.getElementById(id)?.classList.add("hidden");
  }
}

async function loadReplyPage(
  page: number,
  threadDid: string,
  threadTid: string,
  handle: string,
  userDid: string,
  sysopDid: string,
) {
  const container = document.getElementById("replies")!;
  const loading = document.getElementById("replies-loading");

  try {
    const data = await fetchJson<RepliesResponse>(
      `/api/replies/${threadDid}/${threadTid}?handle=${encodeURIComponent(handle)}&page=${page}`,
    );

    if (loading) loading.remove();

    for (const r of data.replies) {
      allReplies[r.uri] = r;
    }

    for (const r of data.replies) {
      container.insertAdjacentHTML(
        "beforeend",
        renderReply(r, handle, threadDid, threadTid, userDid, sysopDid),
      );
    }

    if (data.total_pages > 1) {
      const goToPage = (p: number) => {
        container.innerHTML =
          '<p id="replies-loading" class="text-neutral-500">Loading replies...</p>';
        hideNavs();
        const url = new URL(window.location.href);
        url.searchParams.set("page", String(p));
        history.pushState(null, "", url.toString());
        loadReplyPage(p, threadDid, threadTid, handle, userDid, sysopDid);
        document.getElementById("replies-nav-top")?.scrollIntoView({ behavior: "smooth" });
      };
      updateNavs(data.page, data.total_pages, goToPage);
    }

    if (container.children.length === 0 && !userDid) {
      container.innerHTML = '<p class="text-neutral-500">No replies yet.</p>';
    }
  } catch {
    if (loading) loading.textContent = "Could not fetch replies.";
  }
}

// --- Init ---

export function initThread() {
  const threadDid = getData("replies", "threadDid");
  const threadTid = getData("replies", "threadTid");
  const handle = getData("replies", "handle");
  const userDid = getData("replies", "userDid");
  const sysopDid = getData("replies", "sysopDid");

  document.getElementById("quote-clear")?.addEventListener("click", clearQuote);
  document.getElementById("replies")?.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".quote-btn") as HTMLElement | null;
    if (btn) quoteReply(btn.dataset.uri!, btn.dataset.handle!);
  });

  const initialPage = parseInt(new URLSearchParams(window.location.search).get("page") ?? "1", 10);
  loadReplyPage(initialPage, threadDid, threadTid, handle, userDid, sysopDid);

  window.addEventListener("popstate", () => {
    const p = parseInt(new URLSearchParams(window.location.search).get("page") ?? "1", 10);
    const container = document.getElementById("replies")!;
    container.innerHTML = '<p id="replies-loading" class="text-neutral-500">Loading replies...</p>';
    hideNavs();
    loadReplyPage(p, threadDid, threadTid, handle, userDid, sysopDid);
  });
}
