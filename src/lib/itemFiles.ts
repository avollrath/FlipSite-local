import { compressImage } from '@/lib/compressImage'
import { blockDemoMode, isDemoModeEmail } from '@/lib/demoMode'
import { getFirstImagePathByItemId, getItemFilePath } from '@/lib/itemFilePaths'
import { supabase } from '@/lib/supabase'

const ITEM_FILES_BUCKET = 'item-files'
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60
const DEFAULT_THUMBNAIL_SIZE_PX = 80
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

async function getAuthenticatedUser() {
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    throwSafeFileError(error, 'Unable to verify your session. Please try again.')
  }

  if (!data.user) {
    throw new Error('You must be signed in to manage item files.')
  }

  return data.user
}

export async function uploadItemFile(itemId: string, file: File) {
  const user = await getAuthenticatedUser()
  if (isDemoModeEmail(user.email)) {
    blockDemoMode()
  }

  const shouldCompress = isImageFile(file)
  let uploadFile: File

  try {
    uploadFile = shouldCompress ? await compressImage(file) : file
  } catch (error) {
    throwSafeFileError(error, 'Unable to prepare file for upload. Please try again.')
  }

  const fileType: ItemFile['file_type'] = shouldCompress ? 'image' : 'file'
  const timestamp = Date.now()
  const filePath = getItemFilePath({
    fileName: uploadFile.name,
    itemId,
    timestamp,
    userId: user.id,
  })

  const { error: uploadError } = await supabase.storage
    .from(ITEM_FILES_BUCKET)
    .upload(filePath, uploadFile, {
      cacheControl: '3600',
      contentType: uploadFile.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    throwSafeFileError(uploadError, 'Unable to upload file. Please try again.')
  }

  const { data, error: insertError } = await supabase
    .from('item_files')
    .insert({
      item_id: itemId,
      user_id: user.id,
      file_path: filePath,
      file_type: fileType,
      original_name: file.name,
      mime_type: uploadFile.type || file.type || null,
      size_bytes: uploadFile.size,
    })
    .select()
    .single()

  if (insertError) {
    await supabase.storage.from(ITEM_FILES_BUCKET).remove([filePath])
    throwSafeFileError(insertError, 'Unable to save file details. Please try again.')
  }

  return data
}

export async function getItemFiles(itemId: string) {
  const user = await getAuthenticatedUser()
  const { data, error } = await supabase
    .from('item_files')
    .select('*')
    .eq('item_id', itemId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throwSafeFileError(error, 'Unable to load item files. Please try again.')
  }

  return data
}

export async function deleteItemFile(fileId: string, filePath: string) {
  const user = await getAuthenticatedUser()
  if (isDemoModeEmail(user.email)) {
    blockDemoMode()
  }

  const { error: storageError } = await supabase.storage
    .from(ITEM_FILES_BUCKET)
    .remove([filePath])

  if (storageError) {
    throwSafeFileError(storageError, 'Unable to remove file from storage. Please try again.')
  }

  const { error: deleteError } = await supabase
    .from('item_files')
    .delete()
    .eq('id', fileId)
    .eq('user_id', user.id)

  if (deleteError) {
    throwSafeFileError(deleteError, 'Unable to delete file details. Please try again.')
  }
}

export async function getSignedItemFileUrl(filePath: string) {
  if (isDemoImagePath(filePath)) {
    return normalizeDemoImagePath(filePath)
  }

  const { data, error } = await supabase.storage
    .from(ITEM_FILES_BUCKET)
    .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN_SECONDS)

  if (error) {
    throwSafeFileError(error, 'Unable to open file. Please try again.')
  }

  return data.signedUrl
}

export async function getFirstItemImageThumbnails(
  itemIds: string[],
  options: { size?: number } = {},
) {
  const user = await getAuthenticatedUser()
  const uniqueItemIds = Array.from(new Set(itemIds)).filter(Boolean)
  const size = options.size ?? DEFAULT_THUMBNAIL_SIZE_PX

  if (uniqueItemIds.length === 0) {
    return []
  }

  const { data: imageFiles, error } = await supabase
    .from('item_files')
    .select('item_id,file_path,created_at')
    .in('item_id', uniqueItemIds)
    .eq('file_type', 'image')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throwSafeFileError(error, 'Unable to load item thumbnails. Please try again.')
  }

  const firstImageByItemId = getFirstImagePathByItemId(imageFiles ?? [])

  const thumbnails = await Promise.all(
    Array.from(firstImageByItemId.entries()).map(async ([itemId, filePath]) => {
      if (isDemoImagePath(filePath)) {
        return {
          item_id: itemId,
          file_path: filePath,
          signed_url: normalizeDemoImagePath(filePath),
        }
      }

      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from(ITEM_FILES_BUCKET)
        .createSignedUrl(filePath, SIGNED_URL_EXPIRES_IN_SECONDS, {
          transform: {
            height: size,
            quality: 70,
            resize: 'cover',
            width: size,
          },
        })

      if (signedUrlError) {
        throwSafeFileError(signedUrlError, 'Unable to load item thumbnail. Please try again.')
      }

      return {
        item_id: itemId,
        file_path: filePath,
        signed_url: signedUrl.signedUrl,
      }
    }),
  )

  return thumbnails
}

function isDemoImagePath(filePath: string) {
  return filePath.startsWith(DEMO_IMAGE_PATH_PREFIX)
}

function normalizeDemoImagePath(filePath: string) {
  return filePath
}

function throwSafeFileError(error: unknown, message: string): never {
  if (import.meta.env.DEV) {
    console.error(error)
  }

  throw new Error(message)
}
