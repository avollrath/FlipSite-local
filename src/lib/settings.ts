import type { ItemStatus } from '@/types'
import { normalizeItemCondition } from '@/lib/conditions'

export type FlipSiteSettings = {
  defaultCategory: string
  defaultCondition: string
  defaultPlatform: string
  defaultStatus: ItemStatus
}

const settingsKey = 'flipsite-settings'
const settingStorageKeys = {
  defaultCategory: 'default_category',
  defaultCondition: 'default_condition',
  defaultPlatform: 'default_platform',
  defaultStatus: 'default_status',
} as const

const validStatuses: ItemStatus[] = ['holding', 'listed', 'sold', 'keeper']

export const defaultSettings: FlipSiteSettings = {
  defaultCategory: '',
  defaultCondition: 'Good',
  defaultPlatform: '',
  defaultStatus: 'holding',
}

export function loadSettings(): FlipSiteSettings {
  if (typeof window === 'undefined') {
    return defaultSettings
  }

  try {
    const legacySettings = loadLegacySettings()

    return {
      ...defaultSettings,
      ...legacySettings,
      defaultCategory:
        window.localStorage.getItem(settingStorageKeys.defaultCategory) ??
        legacySettings.defaultCategory ??
        defaultSettings.defaultCategory,
      defaultCondition:
        normalizeItemCondition(
          window.localStorage.getItem(settingStorageKeys.defaultCondition) ??
            legacySettings.defaultCondition ??
            defaultSettings.defaultCondition,
        ),
      defaultPlatform:
        window.localStorage.getItem(settingStorageKeys.defaultPlatform) ??
        legacySettings.defaultPlatform ??
        defaultSettings.defaultPlatform,
      defaultStatus: normalizeStatus(
        window.localStorage.getItem(settingStorageKeys.defaultStatus) ??
          legacySettings.defaultStatus,
      ),
    }
  } catch {
    return defaultSettings
  }
}

export function saveSetting<K extends keyof FlipSiteSettings>(
  key: K,
  value: FlipSiteSettings[K],
) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(settingStorageKeys[key], value)
}

export function saveSettings(settings: FlipSiteSettings) {
  if (typeof window === 'undefined') {
    return
  }

  saveSetting('defaultCategory', settings.defaultCategory)
  saveSetting('defaultCondition', settings.defaultCondition)
  saveSetting('defaultPlatform', settings.defaultPlatform)
  saveSetting('defaultStatus', settings.defaultStatus)
}

export function clearSettings() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(settingsKey)
  Object.values(settingStorageKeys).forEach((key) =>
    window.localStorage.removeItem(key),
  )
}

function loadLegacySettings(): Partial<FlipSiteSettings> {
  const storedSettings = window.localStorage.getItem(settingsKey)

  if (!storedSettings) {
    return {}
  }

  return JSON.parse(storedSettings)
}

function normalizeStatus(status: unknown): ItemStatus {
  return validStatuses.includes(status as ItemStatus)
    ? (status as ItemStatus)
    : defaultSettings.defaultStatus
}
