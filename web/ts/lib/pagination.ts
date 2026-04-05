import { fetchJson } from "./api";

interface PaginationOptions<T> {
  fetchUrl: (cursor: string | null) => string;
  containerId: string;
  loadingId: string;
  nextContainerId: string;
  loadMoreId: string;
  dataKey: string;
  renderItem: (item: T) => string | HTMLElement;
  emptyMessage?: string;
  onData?: (data: Record<string, unknown>) => void;
}

export function createPaginatedLoader<T>(options: PaginationOptions<T>) {
  let nextCursor: string | null = null;

  function load(cursor: string | null) {
    const url = options.fetchUrl(cursor);

    fetchJson<Record<string, unknown>>(url)
      .then((data) => {
        const container = document.getElementById(options.containerId);
        const loading = document.getElementById(options.loadingId);
        if (!container) return;
        if (loading) loading.remove();

        options.onData?.(data);

        const items = data[options.dataKey] as T[];
        for (const item of items) {
          const rendered = options.renderItem(item);
          if (typeof rendered === "string") {
            container.insertAdjacentHTML("beforeend", rendered);
          } else {
            container.appendChild(rendered);
          }
        }

        nextCursor = (data.cursor as string) ?? null;
        const nextContainer = document.getElementById(options.nextContainerId);
        if (nextContainer) {
          nextContainer.classList.toggle("hidden", !nextCursor);
        }

        if (container.children.length === 0 && options.emptyMessage) {
          container.innerHTML = `<p class="text-neutral-500">${options.emptyMessage}</p>`;
        }
      })
      .catch(() => {
        const loading = document.getElementById(options.loadingId);
        if (loading) loading.textContent = "Could not fetch data.";
      });
  }

  // Bind load-more button
  const loadMoreBtn = document.getElementById(options.loadMoreId);
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      if (nextCursor) load(nextCursor);
    });
  }

  // Initial load
  load(null);
}
