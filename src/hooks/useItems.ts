import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { blockDemoMode, isDemoModeBlockedError } from '@/lib/demoMode'
import { supabase } from '@/lib/supabase'
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

      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      return (data as Item[]).map(normalizeItem)
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

      const { data, error } = await supabase
        .from('items')
        .insert({ ...item, user_id: user.id })
        .select()
        .single()

      if (error) {
        throw error
      }

      const createdItem = normalizeItem(data as Item)

      if (createdItem.bundle_id) {
        await markBundleParentSoldIfComplete(createdItem.bundle_id, user.id)
      }

      return createdItem
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Item added')
    },
    onError: (error) => {
      if (isDemoModeBlockedError(error)) {
        return
      }
      logError(error)
      toast.error('Unable to add item. Please try again.')
    },
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

      const { data: parentItem, error: parentError } = await supabase
        .from('items')
        .insert({ ...parent, user_id: user.id, is_bundle_parent: true })
        .select()
        .single()

      if (parentError) {
        throw parentError
      }

      const typedParent = normalizeItem(parentItem as Item)

      if (children.length > 0) {
        const childRows = children.map((child) => ({
          ...child,
          buy_price: child.buy_price ?? 0,
          bundle_id: typedParent.tsid,
          bought_at: parent.bought_at,
          buy_platform: parent.buy_platform ?? null,
          is_bundle_parent: false,
          sell_platform: null,
          sell_price: null,
          sold_at: null,
          user_id: user.id,
        }))
        const { error: childError } = await supabase.from('items').insert(childRows)

        if (childError) {
          throw childError
        }
      }

      return typedParent
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Bundle added')
    },
    onError: (error) => {
      if (isDemoModeBlockedError(error)) {
        return
      }
      logError(error)
      toast.error('Unable to add bundle. Please try again.')
    },
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

      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('tsid', tsid)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      const updatedItem = normalizeItem(data as Item)

      if (syncBundleParent && updatedItem.bundle_id) {
        await markBundleParentSoldIfComplete(updatedItem.bundle_id, user.id)
      }

      return updatedItem
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
    onError: (error) => {
      if (isDemoModeBlockedError(error)) {
        return
      }
      logError(error)
      toast.error('Unable to update item. Please try again.')
    },
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

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('tsid', tsid)
        .eq('user_id', user.id)

      if (error) {
        throw error
      }

      return tsid
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: itemsQueryKey(user?.id) })
      toast.success('Item deleted')
    },
    onError: (error) => {
      if (isDemoModeBlockedError(error)) {
        return
      }
      logError(error)
      toast.error('Unable to delete item. Please try again.')
    },
  })
}

function logError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error(error)
  }
}

async function markBundleParentSoldIfComplete(
  bundleParentTsid: string,
  userId: string,
) {
  const { data: parent, error: parentLookupError } = await supabase
    .from('items')
    .select('status')
    .eq('tsid', bundleParentTsid)
    .eq('user_id', userId)
    .eq('is_bundle_parent', true)
    .single()

  if (parentLookupError) {
    throw parentLookupError
  }

  if (parent?.status === 'keeper') {
    return
  }

  const { data: children, error: childrenError } = await supabase
    .from('items')
    .select('tsid,status,sold_at')
    .eq('bundle_id', bundleParentTsid)
    .eq('user_id', userId)

  if (childrenError) {
    throw childrenError
  }

  if (!children?.length || children.some((child) => child.status !== 'sold')) {
    return
  }

  const latestSoldAt =
    children
      .map((child) => child.sold_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ??
    new Date().toISOString()

  const { error: parentError } = await supabase
    .from('items')
    .update({ sold_at: latestSoldAt, status: 'sold' })
    .eq('tsid', bundleParentTsid)
    .eq('user_id', userId)
    .eq('is_bundle_parent', true)

  if (parentError) {
    throw parentError
  }
}
