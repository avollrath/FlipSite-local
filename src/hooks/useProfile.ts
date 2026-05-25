import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { blockDemoMode } from '@/lib/demoMode'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  username: string | null
  avatar_url: string | null
  updated_at: string | null
}

type ProfileUpdate = {
  username?: string | null
  avatar_url?: string | null
}

const avatarsBucket = 'avatars'

export const profileQueryKey = (userId: string | undefined) =>
  ['profile', userId] as const

export function useProfile() {
  const { isDemoMode, user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = profileQueryKey(user?.id)

  const profileQuery = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user?.id) {
        return null
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id,username,avatar_url,updated_at')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        return data
      }

      const { data: createdProfile, error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          avatar_url: null,
          id: user.id,
          updated_at: new Date().toISOString(),
          username: null,
        })
        .select('id,username,avatar_url,updated_at')
        .single()

      if (upsertError) {
        throw upsertError
      }

      return createdProfile
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileUpdate) => {
      if (!user?.id) {
        throw new Error('You must be signed in to update your profile.')
      }

      if (isDemoMode) {
        blockDemoMode()
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          updated_at: new Date().toISOString(),
          ...data,
        })
        .select('id,username,avatar_url,updated_at')
        .single()

      if (error) {
        throw error
      }

      return updatedProfile
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(queryKey, updatedProfile)
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: Blob) => {
      if (!user?.id) {
        throw new Error('You must be signed in to upload an avatar.')
      }

      if (isDemoMode) {
        blockDemoMode()
      }

      const filePath = `${user.id}/avatar.webp`
      const { error: uploadError } = await supabase.storage
        .from(avatarsBucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: 'image/webp',
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from(avatarsBucket).getPublicUrl(filePath)
      const updatedProfile = await updateProfileMutation.mutateAsync({
        avatar_url: data.publicUrl,
      })

      return updatedProfile.avatar_url
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    isLoading: profileQuery.isLoading,
    isSaving: updateProfileMutation.isPending,
    isUploading: uploadAvatarMutation.isPending,
    profile: profileQuery.data ?? null,
    updateProfile: updateProfileMutation.mutateAsync,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
  }
}
