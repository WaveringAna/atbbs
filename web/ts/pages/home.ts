import { escapeHtml } from "../lib/util";
import { fetchJson } from "../lib/api";
import { resolveIdentitiesBatch } from "../lib/atproto";
import { SITE } from "../lib/lexicon";

interface UFORecord {
  did: string;
  record: { name?: string; description?: string };
}

export function initHome() {
  const form = document.getElementById("handle-form") as HTMLFormElement;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = form.elements.namedItem("handle") as HTMLInputElement;
    const handle = input.value.trim();
    if (handle) window.location.href = "/bbs/" + encodeURIComponent(handle);
  });

  loadDiscover();
  initInstallTabs();
}

function initInstallTabs() {
  document
    .querySelectorAll<HTMLElement>(".install-tab[data-install]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = btn.dataset.install!;

        document.querySelectorAll(".install-tab").forEach((b) => {
          b.classList.remove("text-neutral-200", "border-neutral-200");
          b.classList.add("text-neutral-500", "border-transparent");
        });
        btn.classList.remove("text-neutral-500", "border-transparent");
        btn.classList.add("text-neutral-200", "border-neutral-200");

        document
          .querySelectorAll(".install-panel")
          .forEach((p) => p.classList.add("hidden"));
        document.getElementById(`install-${name}`)?.classList.remove("hidden");
      });
    });
}

async function loadDiscover() {
  try {
    let records = await fetchJson<UFORecord[]>(
      `https://ufos-api.microcosm.blue/records?collection=${SITE}&limit=50`,
    );

    if (!records.length) return;

    // Sample 5 random
    if (records.length > 5) {
      records = records.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    const dids = records.map((r) => r.did);
    const authors = await resolveIdentitiesBatch(dids);

    const list = document.getElementById("discover-list");
    if (!list) return;

    for (const r of records) {
      if (!(r.did in authors)) continue;
      const handle = authors[r.did].handle;
      const name = r.record.name || handle;
      const desc = r.record.description || "";

      const a = document.createElement("a");
      a.href = "/bbs/" + encodeURIComponent(handle);
      a.className =
        "flex items-baseline gap-3 px-3 py-2 -mx-3 rounded hover:bg-neutral-900 group";
      a.innerHTML = `<span class="text-neutral-200 group-hover:text-white">${escapeHtml(name)}</span><span class="text-neutral-500">${escapeHtml(desc)}</span>`;
      list.appendChild(a);
    }

    document.getElementById("discover")?.classList.remove("hidden");
  } catch {
    // silently fail — discovery is optional
  }
}
