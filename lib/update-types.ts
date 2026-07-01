export const UPDATE_CATEGORIES = [
  "Release",
  "Feature",
  "Partnership",
  "Research",
  "Preview",
  "Insight"
] as const;

export type UpdateCategory = (typeof UPDATE_CATEGORIES)[number];

export type UpdateSummary = {
  title: string;
  date: string;
  category: UpdateCategory;
  description: string;
  slug: string;
};

export type UpdatePost = UpdateSummary & {
  content: string;
  updatedAt: string;
};
