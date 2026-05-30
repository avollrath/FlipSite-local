export type ItemStatus = 'holding' | 'listed' | 'sold' | 'keeper'

export type Item = {
  tsid: string
  user_id: string
  name: string
  category: string
  condition: string
  buy_price: number
  sell_price: number | null
  platform?: string | null
  buy_platform?: string | null
  sell_platform?: string | null
  status: ItemStatus
  bought_at: string
  sold_at: string | null
  notes: string | null
  created_at: string
  bundle_id?: string | null
  is_bundle_parent?: boolean
  cover_image_id?: string | null
}
