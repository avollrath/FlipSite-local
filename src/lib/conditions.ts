export const itemConditions = ['New', 'Like new', 'Good', 'Okay', 'Poor'] as const

export type ItemCondition = (typeof itemConditions)[number]

export function normalizeItemCondition(condition: string | null | undefined) {
  const normalized = condition?.trim().toLowerCase()

  if (!normalized) {
    return 'Good'
  }

  if (normalized === 'new') {
    return 'New'
  }

  if (normalized === 'like new') {
    return 'Like new'
  }

  if (normalized === 'good' || normalized === 'very good') {
    return 'Good'
  }

  if (
    normalized === 'okay' ||
    normalized === 'ok' ||
    normalized === 'fair' ||
    normalized === 'used'
  ) {
    return 'Okay'
  }

  if (normalized === 'poor') {
    return 'Poor'
  }

  return 'Okay'
}
