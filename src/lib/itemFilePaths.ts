export function getSafeFileName(fileName: string) {
  const trimmedFileName = fileName.trim()
  const extensionMatch = trimmedFileName.match(/\.[^/.]+$/)
  const extension = extensionMatch?.[0].toLowerCase() ?? ''
  const baseName = trimmedFileName.replace(/\.[^/.]+$/, '').trim()
  const safeBaseName = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${safeBaseName || 'file'}${extension}`
}

export function getItemFilePath({
  fileName,
  itemId,
  timestamp,
  userId,
}: {
  fileName: string
  itemId: string
  timestamp: number
  userId: string
}) {
  return `${userId}/${itemId}/${timestamp}-${getSafeFileName(fileName)}`
}

export type ItemImageFilePath = {
  created_at: string
  file_path: string
  id: string
  item_id: string
}

export function getFirstImagePathByItemId(
  imageFiles: ItemImageFilePath[],
  coverImageByItemId: Map<string, string | null | undefined> = new Map(),
) {
  const firstImageByItemId = new Map<string, string>()
  const imageFileById = new Map(imageFiles.map((imageFile) => [imageFile.id, imageFile]))

  for (const [itemId, coverImageId] of coverImageByItemId.entries()) {
    const coverImage = coverImageId ? imageFileById.get(coverImageId) : null

    if (coverImage?.item_id === itemId) {
      firstImageByItemId.set(itemId, coverImage.file_path)
    }
  }

  for (const imageFile of imageFiles) {
    if (!firstImageByItemId.has(imageFile.item_id)) {
      firstImageByItemId.set(imageFile.item_id, imageFile.file_path)
    }
  }

  return firstImageByItemId
}
