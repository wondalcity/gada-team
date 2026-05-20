// Client-side persistence of bid selections for demo/dummy data.
// Real bids are persisted server-side; demo bids (publicId starting with
// "demo-bid-") have no DB row, so we mirror the selection locally so the UI
// reflects "선정됨" / "미선정" state across reloads.

const STORAGE_KEY = "gada_demo_bid_selections";

export interface DemoBidSelection {
  jobPublicId: string;
  bidPublicId: string;
  selectedAt: string;
}

function readAll(): DemoBidSelection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: DemoBidSelection[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getDemoSelection(jobPublicId: string): DemoBidSelection | null {
  return readAll().find((s) => s.jobPublicId === jobPublicId) ?? null;
}

export function selectDemoBid(jobPublicId: string, bidPublicId: string) {
  const items = readAll().filter((s) => s.jobPublicId !== jobPublicId);
  items.push({ jobPublicId, bidPublicId, selectedAt: new Date().toISOString() });
  writeAll(items);
}

export function clearDemoSelection(jobPublicId: string) {
  writeAll(readAll().filter((s) => s.jobPublicId !== jobPublicId));
}

export function getAllDemoSelections(): DemoBidSelection[] {
  return readAll();
}
