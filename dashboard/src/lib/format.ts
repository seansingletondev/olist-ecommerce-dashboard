const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const currencyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "2-digit",
});

export function formatCount(n: number): string {
  return compactNumber.format(n);
}

export function formatCurrencyCompact(n: number): string {
  return currencyCompact.format(n);
}

export function formatCurrencyFull(n: number): string {
  return currencyFull.format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function formatMonth(iso: string): string {
  return monthLabel.format(new Date(iso));
}

export function truncateId(id: string, length = 8): string {
  return id.length > length ? `${id.slice(0, length)}…` : id;
}

/** "health_beauty" -> "Health beauty" -- the source data's category names are snake_case. */
export function formatCategoryLabel(category: string): string {
  const spaced = category.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
