import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { apiFetch } from '@/lib/api'
import { blockDemoMode, isDemoModeBlockedError } from '@/lib/demoMode'
import { normalizeItemCondition } from '@/lib/conditions'
import type { Item } from '@/types'

export const itemsQueryKey = (userId: string | undefined) => [
  'items',
  userId,
] as const

export type NewItem = Omit<Item, 'tsid' | 'created_at' | 'user_id'> & {
  user_id?: string
}

export type ItemUpdate = Partial<Omit<Item, 'tsid' | 'user_id' | 'created_at'>>
type UpdateItemMutation = {
  syncBundleParent?: boolean
  tsid: string
  updates: ItemUpdate
}
export type NewBundleChild = {
  name: string
  category: string
  condition: string
  status: Item['status']
  buy_price?: number
  notes?: string | null
}

export function useItems() {
  const { user } = useAuth()

  return useQuery({
    queryKey: itemsQueryKey(user?.id),
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return []
      }

      const data = await apiFetch<Item[]>('/items')
      return data.map(normalizeItem)
    },
  })
}

function normalizeItem(item: Item): Item {
  return {
    ...item,
    condition: normalizeItemCondition(item.condition),
  }
}

export function useAddItem() {
  const { isDemoMode, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: NewItem) => {
      if (!user?.id) {
        throw new Error('You must be signed in to add items')
      }
      if (isDemoMode) {
        blockDemoMode()
      }
      return normalizeItem(
        await apiFetch<Item>('/items', {
          method: 'POST',
          body: JSON.stringify(item),
        }),
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Item added')
    },
    onError: handleMutationError('Unable to add item. Please try again.'),
  })
}

export function useAddBundle() {
  const { isDemoMode, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      children,
      parent,
    }: {
      children: NewBundleChild[]
      parent: NewItem
    }) => {
      if (!user?.id) {
        throw new Error('You must be signed in to add bundles')
      }
      if (isDemoMode) {
        blockDemoMode()
      }
      return normalizeItem(
        await apiFetch<Item>('/bundles', {
          method: 'POST',
          body: JSON.stringify({ children, parent }),
        }),
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Bundle added')
    },
    onError: handleMutationError('Unable to add bundle. Please try again.'),
  })
}

export function useUpdateItem() {
  const { isDemoMode, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      syncBundleParent = true,
      tsid,
      updates,
    }: UpdateItemMutation) => {
      if (!user?.id) {
        throw new Error('You must be signed in to update items')
      }
      if (isDemoMode) {
        blockDemoMode()
      }
      const query = syncBundleParent ? '' : '?syncBundleParent=0'
      return normalizeItem(
        await apiFetch<Item>(`/items/${tsid}${query}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }),
      )
    },
    onSuccess: async (updatedItem) => {
      queryClient.setQueryData<Item[]>(
        itemsQueryKey(user?.id),
        (currentItems = []) =>
          currentItems.map((item) =>
            item.tsid === updatedItem.tsid ? updatedItem : item,
          ),
      )
      await queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Item updated')
    },
    onError: handleMutationError('Unable to update item. Please try again.'),
  })
}

export function useDeleteItem() {
  const { isDemoMode, user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tsid: string) => {
      if (!user?.id) {
        throw new Error('You must be signed in to delete items')
      }
      if (isDemoMode) {
        blockDemoMode()
      }
      await apiFetch<void>(`/items/${tsid}`, { method: 'DELETE' })
      return tsid
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Item deleted')
    },
    onError: handleMutationError('Unable to delete item. Please try again.'),
  })
}

function handleMutationError(message: string) {
  return (error: unknown) => {
    if (isDemoModeBlockedError(error)) {
      return
    }
    if (import.meta.env.DEV) {
      console.error(error)
    }
    toast.error(message)
  }
}
