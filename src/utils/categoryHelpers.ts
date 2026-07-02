export type DisplayCategory = {
  id: string;
  name: string;
  name_ro?: string;
};

export function dedupeCategoriesByDisplayName<T extends DisplayCategory>(categories: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const category of categories) {
    const label = (category.name || category.name_ro || "").trim().toLocaleLowerCase();
    const key = label || category.id;

    if (seen.has(key)) continue;
    seen.add(key);
    result.push(category);
  }

  return result;
}
