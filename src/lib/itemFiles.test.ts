import { describe, expect, it } from 'vitest'
import {
  getFirstImagePathByItemId,
  getItemFilePath,
  getSafeFileName,
} from '@/lib/itemFilePaths'

describe('item file helpers', () => {
  it('keeps safe filenames compact and preserves the extension', () => {
    expect(getSafeFileName(' My Receipt #1.PDF ')).toBe('My-Receipt-1.pdf')
    expect(getSafeFileName('***')).toBe('file')
  })

  it('builds storage paths under user and item folders', () => {
    expect(
      getItemFilePath({
        fileName: ' Front Photo.JPG ',
        itemId: 'item-456',
        timestamp: 1777645363000,
        userId: 'user-123',
      }),
    ).toBe('user-123/item-456/1777645363000-Front-Photo.jpg')
  })

  it('uses the first image path returned for each item', () => {
    expect(
      Array.from(
        getFirstImagePathByItemId([
          {
            created_at: '2026-05-01T12:00:00Z',
            file_path: 'user/item-a/newer.jpg',
            id: 'image-a-newer',
            item_id: 'item-a',
          },
          {
            created_at: '2026-05-01T10:00:00Z',
            file_path: 'user/item-a/older.jpg',
            id: 'image-a-older',
            item_id: 'item-a',
          },
          {
            created_at: '2026-05-01T09:00:00Z',
            file_path: 'user/item-b/only.jpg',
            id: 'image-b-only',
            item_id: 'item-b',
          },
        ]).entries(),
      ),
    ).toEqual([
      ['item-a', 'user/item-a/newer.jpg'],
      ['item-b', 'user/item-b/only.jpg'],
    ])
  })

  it('uses the selected cover image when available', () => {
    expect(
      Array.from(
        getFirstImagePathByItemId(
          [
            {
              created_at: '2026-05-01T12:00:00Z',
              file_path: 'user/item-a/newer.jpg',
              id: 'image-a-newer',
              item_id: 'item-a',
            },
            {
              created_at: '2026-05-01T10:00:00Z',
              file_path: 'user/item-a/older.jpg',
              id: 'image-a-older',
              item_id: 'item-a',
            },
          ],
          new Map([['item-a', 'image-a-older']]),
        ).entries(),
      ),
    ).toEqual([['item-a', 'user/item-a/older.jpg']])
  })
})
