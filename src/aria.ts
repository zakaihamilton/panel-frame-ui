export function mergeAriaDescriptionIds(...values: (string | undefined)[]) {
  const ids = values.flatMap((value) => value?.split(/\s+/) ?? []);
  return [...new Set(ids.filter(Boolean))].join(" ") || undefined;
}
