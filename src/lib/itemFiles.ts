import { apiFetch, localAssetUrl } from '@/lib/api'
import { compressImage } from '@/lib/compressImage'

const DEMO_IMAGE_PATH_PREFIX = '/demo-items/'

export type ItemFile = {
  id: string
  item_id: string
  user_id: string
  file_path: string
  file_type: 'image' | 'file'
  original_name: string | null
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

export type ItemImageThumbnail = {
  item_id: string
  file_path: string
  signed_url: string
}

function isImageFile(file: File) {
  return file.type.startsWith('image/')
}

export async function uploadItemFile(itemId: string, file: File) {
  let uploadFile: File

  try {
    uploadFile = isImageFile(file) ? await compressImage(file) : file
  } catch (error) {
    throwSafeFileError(error, 'Unable to prepare file for upload. Please try again.')
  }

  const body = new FormData()
  body.append('file', uploadFile, file.name)

  try {
    return await apiFetch<ItemFile>(`/items/${itemId}/files`, {
      method: 'POST',
      body,
    })
  } catch (error) {
    throwSafeFileError(error, 'Unable to upload file. Please try again.')
  }
}

export async function getItemFiles(itemId: string) {
  try {
    return await apiFetch<ItemFile[]>(`/items/${itemId}/files`)
  } catch (error) {
    throwSafeFileError(error, 'Unable to load item files. Please try again.')
  }
}

export async function deleteItemFile(fileId: string, filePath: string) {
  void filePath
  try {
    await apiFetch<void>(`/files/${fileId}`, { method: 'DELETE' })
  } catch (error) {
    throwSafeFileError(error, 'Unable to delete file. Please try again.')
  }
}

export async function getSignedItemFileUrl(filePath: string) {
  if (isDemoImagePath(filePath)) {
    return normalizeDemoImagePath(filePath)
  }

  try {
    const urls = await apiFetch<Record<string, string>>('/files/urls', {
      method: 'POST',
      body: JSON.stringify({ file_paths: [filePath] }),
    })
    const url = urls[filePath]
    if (!url) {
      throw new Error('File not found')
    }
    return localAssetUrl(url)
  } catch (error) {
    throwSafeFileError(error, 'Unable to open file. Please try again.')
  }
}

export async function getFirstItemImageThumbnails(
  itemIds: string[],
  options: {
    coverImageByItemId?: Map<string, string | null | undefined>
    size?: number
  } = {},
) {
  const uniqueItemIds = Array.from(new Set(itemIds)).filter(Boolean)

  if (uniqueItemIds.length === 0) {
    return []
  }

  try {
    const thumbnails = await apiFetch<ItemImageThumbnail[]>('/files/thumbnails', {
      method: 'POST',
      body: JSON.stringify({
        item_ids: uniqueItemIds,
        cover_images: Object.fromEntries(options.coverImageByItemId ?? []),
        size: options.size,
      }),
    })
    return thumbnails.map((thumbnail) => ({
      ...thumbnail,
      signed_url: localAssetUrl(thumbnail.signed_url),
    }))
  } catch (error) {
    throwSafeFileError(error, 'Unable to load item thumbnails. Please try again.')
  }
}

function isDemoImagePath(filePath: string) {
  return filePath.startsWith(DEMO_IMAGE_PATH_PREFIX)
}

function normalizeDemoImagePath(filePath: string) {
  return `${import.meta.env.BASE_URL}${filePath.slice(1)}`
}

function throwSafeFileError(error: unknown, message: string): never {
  if (import.meta.env.DEV) {
    console.error(error)
  }

  throw new Error(message)
}
