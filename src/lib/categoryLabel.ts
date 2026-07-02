/**
 * Localized category label. Categories are stored with label_ru / label_ro;
 * every display surface must pick by the active UI language.
 */
export interface CategoryLike {
  label_ru?: string | null;
  label_ro?: string | null;
  key?: string | null;
}

export const categoryLabel = (
  category: CategoryLike | null | undefined,
  language: string
): string => {
  if (!category) return "";
  if (language === "ro") {
    return category.label_ro || category.label_ru || category.key || "";
  }
  return category.label_ru || category.label_ro || category.key || "";
};
