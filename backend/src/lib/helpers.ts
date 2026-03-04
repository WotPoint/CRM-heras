import type { Client } from '../types/index.js'

// ─── Tags serialization (SQLite stores JSON as string) ────────────────────────

export function parseTags(tags: string): string[] {
  try { return JSON.parse(tags) } catch { return [] }
}

export function serializeTags(tags?: string[]): string {
  return JSON.stringify(tags ?? [])
}

// Format raw Prisma Client row → typed Client (parse tags)
export function fmtClient(row: Record<string, unknown>): Client {
  return { ...row, tags: parseTags(row.tags as string) } as unknown as Client
}

// ─── Role-based access ────────────────────────────────────────────────────────

export function canView(viewerRole: string, viewerId: string, targetId: string): boolean {
  if (viewerRole === 'admin' || viewerRole === 'supervisor') return true
  return viewerId === targetId
}

// Build Prisma `where` fragment for manager-owned resources
export function ownerFilter(role: string, userId: string, field = 'managerId') {
  return role === 'manager' ? { [field]: userId } : {}
}
