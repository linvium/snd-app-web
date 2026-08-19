import type { SndCategory, SndCategoryNode } from '@/types/category'

/**
 * Flat rows to a tree. The API only ever returns populated categories, so a
 * child whose parent was filtered out is possible in principle; it is promoted
 * to the top level rather than dropped, because a reachable category the user
 * cannot see is worse than one shown a level too high.
 */
export function buildCategoryTree(rows: SndCategory[]): SndCategoryNode[] {
  const nodes = new Map<string, SndCategoryNode>()
  for (const row of rows) {
    nodes.set(row.id, { ...row, children: [] })
  }

  const roots: SndCategoryNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sort = (list: SndCategoryNode[]) => {
    list.sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        b.listing_count - a.listing_count ||
        a.name.localeCompare(b.name, 'sr-RS')
    )
    for (const node of list) sort(node.children)
  }
  sort(roots)

  return roots
}

export function findCategory(
  rows: SndCategory[],
  slug: string | null
): SndCategory | null {
  if (!slug) return null
  // Root categories win ties: /category/<slug> resolves on slug alone, and a
  // root is the broader, less surprising reading.
  const matches = rows.filter((row) => row.slug === slug)
  if (matches.length === 0) return null
  return matches.reduce((best, row) => (row.level < best.level ? row : best))
}

/** "Elektronika › Dron" trimmed to what fits a chip. */
export function categoryChipLabel(category: SndCategory): string {
  return category.name
}

export function totalListings(rows: SndCategory[]): number {
  return rows
    .filter((row) => row.level === 0)
    .reduce((sum, row) => sum + row.listing_count, 0)
}

export function isLeafCategory(
  rows: { id: string; parent_id: string | null }[],
  categoryId: string | null
): boolean {
  if (!categoryId) return false
  return !rows.some((row) => row.parent_id === categoryId)
}

export function categoryPathLabel(category: { full_path: string; name: string }): {
  parentPath: string | null
  leafName: string
} {
  const parts = category.full_path.split(' › ').filter(Boolean)
  if (parts.length <= 1) return { parentPath: null, leafName: category.name }
  return { parentPath: parts.slice(0, -1).join(' › '), leafName: parts[parts.length - 1] }
}
