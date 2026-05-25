import type { Item } from '@/types'
import type { ItemFile } from '@/lib/itemFiles'
import type { Profile } from '@/hooks/useProfile'

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ItemInsert = Omit<
 Item,
 | 'bundle_id'
 | 'buy_platform'
 | 'created_at'
 | 'is_bundle_parent'
 | 'notes'
 | 'platform'
 | 'sell_platform'
 | 'sell_price'
 | 'sold_at'
 | 'tsid'
> &
 Partial<
  Pick<
   Item,
   | 'bundle_id'
   | 'buy_platform'
   | 'created_at'
   | 'is_bundle_parent'
   | 'notes'
   | 'platform'
   | 'sell_platform'
   | 'sell_price'
   | 'sold_at'
   | 'tsid'
  >
 >

type ProfileInsert = Pick<Profile, 'id'> &
 Partial<Pick<Profile, 'avatar_url' | 'updated_at' | 'username'>>

type PublicTables = {
 items: {
  Row: Item
  Insert: ItemInsert
  Update: Partial<Omit<Item, 'tsid' | 'created_at' | 'user_id'>>
  Relationships: []
 }
 item_files: {
  Row: ItemFile
  Insert: Omit<ItemFile, 'id' | 'created_at'> & {
   created_at?: string
   id?: string
  }
  Update: Partial<Omit<ItemFile, 'id' | 'created_at' | 'user_id'>>
  Relationships: []
 }
 profiles: {
  Row: Profile
  Insert: ProfileInsert
  Update: Partial<Profile>
  Relationships: []
 }
}

export type Database = {
 public: {
 Tables: PublicTables
 Views: Record<string, never>
 Functions: Record<string, never>
 Enums: Record<string, never>
 CompositeTypes: Record<string, never>
 }
}

export type { Json }
