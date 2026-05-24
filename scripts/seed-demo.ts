import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

type Category =
  | 'Cameras'
  | 'Gaming'
  | 'Electronics'
  | 'Audio'
  | 'Outdoor'
  | 'Sports'
  | 'Clothing'
  | 'Furniture'
  | 'Home'
type ItemStatus = 'holding' | 'listed' | 'sold' | 'keeper'
type PriceRange = readonly [number, number]

type DemoItem = {
  tsid: string
  user_id: string
  name: string
  category: Category
  condition: string
  buy_price: number
  sell_price: number | null
  buy_platform: string | null
  sell_platform: string | null
  status: ItemStatus
  bought_at: string
  sold_at: string | null
  notes: string | null
  bundle_id: string | null
  is_bundle_parent: boolean
}

type DemoFile = {
  item_id: string
  user_id: string
  file_path: string
  file_type: 'image'
  original_name: string
  mime_type: 'image/webp'
  size_bytes: number
}

type CatalogItem = {
  name: string
  category: Category
  buy: PriceRange
  sell: PriceRange
  condition?: string
  rareCollector?: boolean
}

type BundleSpec = {
  name: string
  category: Category
  buy: number
  children: Array<CatalogItem & { allocatedBuy: number }>
}

const demoEmail = 'demo@flipsite.app'
const demoPassword = 'demo1234'
const buyingPlatforms = [
  'Tori.fi',
  'Facebook Marketplace',
  'Huuto.net',
  'Vinted',
  'Local pickup',
  'Flea market',
  'Verkkokauppa Outlet',
  'Power Outlet',
  'Gigantti Outlet',
  'eBay',
]
const sellingPlatforms = [
  'Tori.fi',
  'Facebook Marketplace',
  'Huuto.net',
  'Vinted',
  'Local pickup',
  'eBay',
]
const conditions = ['New', 'Like new', 'Good', 'Okay', 'Poor']
const notes = {
  holding: [
    'Minor cosmetic wear, fully functional.',
    'Cleaned and tested, waiting for better light for photos.',
    'Listed after checking recent Tori.fi comps.',
    'Bought locally and verified at pickup.',
  ],
  keeper: [
    'Keeping for personal use.',
    'Too useful to sell right now.',
    'Keeping this one unless market price jumps.',
  ],
  listed: [
    'Listed after checking recent Tori.fi comps.',
    'Fresh photos added, priced slightly under recent listings.',
    'Ready for local pickup this week.',
  ],
  sold: [
    'Sold locally after one week.',
    'Accepted small discount for quick pickup.',
    'Bought as part of a bundle, cleaned and tested.',
    'Buyer tested on pickup, smooth sale.',
  ],
} satisfies Record<ItemStatus, string[]>

loadEnv('.env')
loadEnv('.env.local')

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const bundleSpecs: BundleSpec[] = [
  {
    name: 'Nintendo Switch OLED bundle',
    category: 'Gaming',
    buy: 240,
    children: [
      {
        name: 'Nintendo Switch OLED White',
        category: 'Gaming',
        allocatedBuy: 180,
        buy: [180, 230],
        sell: [230, 280],
      },
      {
        name: 'Mario Kart 8 Deluxe',
        category: 'Gaming',
        allocatedBuy: 30,
        buy: [25, 35],
        sell: [35, 45],
      },
      {
        name: 'Zelda Tears of the Kingdom',
        category: 'Gaming',
        allocatedBuy: 30,
        buy: [35, 45],
        sell: [45, 55],
      },
    ],
  },
  {
    name: 'Sony creator camera kit',
    category: 'Cameras',
    buy: 640,
    children: [
      {
        name: 'Sony A6400 Body',
        category: 'Cameras',
        allocatedBuy: 500,
        buy: [450, 600],
        sell: [550, 750],
      },
      {
        name: 'Sigma 30mm f/1.4 DC DN Sony E',
        category: 'Cameras',
        allocatedBuy: 100,
        buy: [90, 140],
        sell: [130, 190],
      },
      {
        name: 'Peak Design Leash Camera Strap',
        category: 'Cameras',
        allocatedBuy: 40,
        buy: [25, 45],
        sell: [35, 60],
      },
    ],
  },
  {
    name: 'Sonos living room audio pair',
    category: 'Audio',
    buy: 260,
    children: [
      {
        name: 'Sonos One SL Pair',
        category: 'Audio',
        allocatedBuy: 220,
        buy: [180, 260],
        sell: [230, 330],
      },
      {
        name: 'IKEA Symfonisk Bookshelf Speaker',
        category: 'Audio',
        allocatedBuy: 40,
        buy: [35, 60],
        sell: [50, 80],
      },
    ],
  },
  {
    name: 'Apple study setup bundle',
    category: 'Electronics',
    buy: 720,
    children: [
      {
        name: 'MacBook Air M1 13-inch 8/256GB',
        category: 'Electronics',
        allocatedBuy: 430,
        buy: [400, 600],
        sell: [500, 750],
      },
      {
        name: 'iPad Mini 6 64GB Wi-Fi',
        category: 'Electronics',
        allocatedBuy: 250,
        buy: [280, 420],
        sell: [350, 520],
      },
      {
        name: 'Apple Magic Keyboard Compact',
        category: 'Electronics',
        allocatedBuy: 40,
        buy: [45, 75],
        sell: [65, 100],
      },
    ],
  },
  {
    name: 'Patagonia winter clothing lot',
    category: 'Clothing',
    buy: 210,
    children: [
      {
        name: 'Patagonia Nano Puff Jacket',
        category: 'Clothing',
        allocatedBuy: 95,
        buy: [70, 120],
        sell: [100, 170],
      },
      {
        name: 'Patagonia Better Sweater Vest',
        category: 'Clothing',
        allocatedBuy: 55,
        buy: [40, 70],
        sell: [60, 95],
      },
      {
        name: 'Fjallraven Keb Trousers',
        category: 'Clothing',
        allocatedBuy: 60,
        buy: [50, 85],
        sell: [70, 120],
      },
    ],
  },
  {
    name: 'Nordic design furniture pickup',
    category: 'Furniture',
    buy: 560,
    children: [
      {
        name: 'IKEA Stockholm Sideboard',
        category: 'Furniture',
        allocatedBuy: 260,
        buy: [220, 330],
        sell: [320, 460],
      },
      {
        name: 'Muuto Around Coffee Table',
        category: 'Furniture',
        allocatedBuy: 180,
        buy: [150, 240],
        sell: [230, 340],
      },
      {
        name: 'Artek 60 Stool Birch',
        category: 'Furniture',
        allocatedBuy: 120,
        buy: [90, 150],
        sell: [130, 210],
      },
    ],
  },
  {
    name: 'Indoor training sports bundle',
    category: 'Sports',
    buy: 870,
    children: [
      {
        name: 'Concept2 Model D Rower PM5',
        category: 'Sports',
        allocatedBuy: 740,
        buy: [650, 850],
        sell: [750, 950],
      },
      {
        name: 'Garmin HRM-Pro Plus Strap',
        category: 'Sports',
        allocatedBuy: 65,
        buy: [45, 80],
        sell: [65, 95],
      },
      {
        name: 'Rogue Fitness Kettlebell 24kg',
        category: 'Sports',
        allocatedBuy: 65,
        buy: [45, 80],
        sell: [65, 100],
      },
    ],
  },
  {
    name: 'Home espresso starter bundle',
    category: 'Home',
    buy: 360,
    children: [
      {
        name: 'Sage Bambino Plus Espresso Machine',
        category: 'Home',
        allocatedBuy: 250,
        buy: [220, 320],
        sell: [300, 420],
      },
      {
        name: 'Baratza Encore Grinder',
        category: 'Home',
        allocatedBuy: 85,
        buy: [70, 110],
        sell: [100, 150],
      },
      {
        name: 'Fellow Stagg EKG Kettle',
        category: 'Home',
        allocatedBuy: 25,
        buy: [25, 45],
        sell: [45, 75],
      },
    ],
  },
  {
    name: 'Weekend hiking gear bundle',
    category: 'Outdoor',
    buy: 430,
    children: [
      {
        name: 'Osprey Atmos AG 65 Backpack',
        category: 'Outdoor',
        allocatedBuy: 160,
        buy: [130, 190],
        sell: [180, 260],
      },
      {
        name: 'MSR Hubba Hubba 2 Tent',
        category: 'Outdoor',
        allocatedBuy: 210,
        buy: [180, 260],
        sell: [240, 340],
      },
      {
        name: 'Primus Lite Plus Stove System',
        category: 'Outdoor',
        allocatedBuy: 60,
        buy: [45, 75],
        sell: [65, 100],
      },
    ],
  },
]

const standaloneCatalog: CatalogItem[] = [
  { name: 'PS5 Disc Console', category: 'Gaming', buy: [300, 380], sell: [370, 450] },
  { name: 'Steam Deck 512GB LCD', category: 'Gaming', buy: [250, 330], sell: [320, 400] },
  { name: 'Nintendo Switch OLED White', category: 'Gaming', buy: [180, 230], sell: [230, 280] },
  { name: 'Mario Kart 8 Deluxe', category: 'Gaming', buy: [25, 35], sell: [35, 45] },
  { name: 'Zelda Tears of the Kingdom', category: 'Gaming', buy: [35, 45], sell: [45, 55] },
  { name: 'Super Smash Bros Ultimate', category: 'Gaming', buy: [35, 45], sell: [45, 58] },
  { name: 'Pokemon SoulSilver Nintendo DS', category: 'Gaming', buy: [65, 95], sell: [95, 140], rareCollector: true },
  { name: 'Game Boy Advance SP AGS-101', category: 'Gaming', buy: [85, 130], sell: [130, 190], rareCollector: true },
  { name: 'Sony A6400 Body', category: 'Cameras', buy: [450, 600], sell: [550, 750] },
  { name: 'Fujifilm X-T30 II Body', category: 'Cameras', buy: [550, 750], sell: [650, 850] },
  { name: 'Canon PowerShot G7 X Mark II', category: 'Cameras', buy: [280, 380], sell: [340, 480] },
  { name: 'Sony ZV-1 Vlogging Camera', category: 'Cameras', buy: [330, 430], sell: [400, 560] },
  { name: 'Panasonic Lumix GH5 Body', category: 'Cameras', buy: [420, 560], sell: [520, 690] },
  { name: 'Sigma 30mm f/1.4 DC DN Sony E', category: 'Cameras', buy: [90, 140], sell: [130, 190] },
  { name: 'Sony FE 85mm f/1.8 Lens', category: 'Cameras', buy: [320, 430], sell: [400, 540] },
  { name: 'MacBook Air M1 13-inch 8/256GB', category: 'Electronics', buy: [400, 600], sell: [500, 750] },
  { name: 'iPad Mini 6 64GB Wi-Fi', category: 'Electronics', buy: [280, 420], sell: [350, 520] },
  { name: 'Apple Watch Series 8 45mm GPS', category: 'Electronics', buy: [180, 260], sell: [230, 340] },
  { name: 'Kindle Paperwhite 11th Gen', category: 'Electronics', buy: [75, 120], sell: [100, 160] },
  { name: 'Dell XPS 13 9310 i7/16GB', category: 'Electronics', buy: [420, 620], sell: [520, 760] },
  { name: 'Samsung Galaxy Tab S8 128GB', category: 'Electronics', buy: [300, 430], sell: [380, 560] },
  { name: 'Garmin Fenix 6 Pro', category: 'Electronics', buy: [180, 280], sell: [250, 350] },
  { name: 'Ubiquiti UniFi Dream Machine', category: 'Electronics', buy: [170, 240], sell: [220, 310] },
  { name: 'Sony WH-1000XM4', category: 'Audio', buy: [90, 150], sell: [130, 190] },
  { name: 'AirPods Pro 2', category: 'Audio', buy: [100, 160], sell: [140, 210] },
  { name: 'Sonos One SL Pair', category: 'Audio', buy: [180, 260], sell: [230, 330] },
  { name: 'DALI Spektor 2 Pair', category: 'Audio', buy: [130, 190], sell: [180, 260] },
  { name: 'Beyerdynamic DT 1990 Pro', category: 'Audio', buy: [260, 360], sell: [330, 460] },
  { name: 'Audio-Technica AT-LP60XBT Turntable', category: 'Audio', buy: [95, 140], sell: [130, 190] },
  { name: 'JBL Charge 5 Speaker', category: 'Audio', buy: [70, 100], sell: [95, 140] },
  { name: 'Osprey Atmos AG 65 Backpack', category: 'Outdoor', buy: [130, 190], sell: [180, 260] },
  { name: 'MSR Hubba Hubba 2 Tent', category: 'Outdoor', buy: [180, 260], sell: [240, 340] },
  { name: 'Garmin inReach Mini 2', category: 'Outdoor', buy: [230, 320], sell: [290, 420] },
  { name: 'Yeti Roadie 24 Cooler', category: 'Outdoor', buy: [130, 190], sell: [170, 250] },
  { name: 'Thule T2 Pro XTR Bike Rack', category: 'Outdoor', buy: [340, 480], sell: [430, 620] },
  { name: 'Peak Design Everyday Backpack 30L', category: 'Outdoor', buy: [150, 220], sell: [200, 300] },
  { name: 'Concept2 Model D Rower PM5', category: 'Sports', buy: [650, 850], sell: [750, 950] },
  { name: 'Garmin Edge 1040 Solar', category: 'Sports', buy: [330, 460], sell: [420, 580] },
  { name: 'Bowflex SelectTech 552 Pair', category: 'Sports', buy: [190, 280], sell: [240, 360] },
  { name: 'Wilson Pro Staff RF97 V13', category: 'Sports', buy: [120, 180], sell: [160, 240] },
  { name: 'TaylorMade SIM2 Driver', category: 'Sports', buy: [170, 250], sell: [230, 330] },
  { name: 'Nike Vaporfly 3 EU 44', category: 'Sports', buy: [90, 140], sell: [125, 190] },
  { name: 'Patagonia Nano Puff Jacket', category: 'Clothing', buy: [70, 120], sell: [100, 170] },
  { name: 'Red Wing Iron Ranger 8111', category: 'Clothing', buy: [120, 220], sell: [170, 280] },
  { name: 'Filson Tin Cloth Jacket', category: 'Clothing', buy: [130, 210], sell: [180, 290] },
  { name: 'Barbour Beaufort Wax Jacket', category: 'Clothing', buy: [120, 190], sell: [170, 260] },
  { name: 'The North Face Nuptse 1996 Jacket', category: 'Clothing', buy: [110, 170], sell: [150, 230] },
  { name: 'Lululemon ABC Pant 32x32', category: 'Clothing', buy: [45, 70], sell: [65, 95] },
  { name: 'IKEA Stockholm Sideboard', category: 'Furniture', buy: [220, 330], sell: [320, 460] },
  { name: 'Muuto Around Coffee Table', category: 'Furniture', buy: [150, 240], sell: [230, 340] },
  { name: 'Artek 60 Stool Birch', category: 'Furniture', buy: [90, 150], sell: [130, 210] },
  { name: 'String Pocket Shelf Oak White', category: 'Furniture', buy: [55, 85], sell: [80, 120] },
  { name: 'IKEA Poang Leather Armchair', category: 'Furniture', buy: [75, 120], sell: [110, 170] },
  { name: 'Hay About A Chair AAC22', category: 'Furniture', buy: [90, 150], sell: [130, 210] },
  { name: 'Sage Bambino Plus Espresso Machine', category: 'Home', buy: [220, 320], sell: [300, 420] },
  { name: 'Baratza Encore Grinder', category: 'Home', buy: [70, 110], sell: [100, 150] },
  { name: 'Dyson V11 Absolute Vacuum', category: 'Home', buy: [220, 330], sell: [300, 430] },
  { name: 'Fellow Stagg EKG Kettle', category: 'Home', buy: [85, 130], sell: [115, 170] },
  { name: 'Le Creuset Dutch Oven 26cm', category: 'Home', buy: [95, 150], sell: [135, 210] },
  { name: 'Nutribullet 900 Series Blender', category: 'Home', buy: [35, 55], sell: [50, 75] },
  { name: 'Elgato Stream Deck MK.2', category: 'Electronics', buy: [80, 120], sell: [110, 160] },
  { name: 'Canon EF 50mm f/1.8 STM', category: 'Cameras', buy: [70, 95], sell: [90, 130] },
  { name: 'Philips Hue Starter Kit E27', category: 'Home', buy: [55, 85], sell: [75, 115] },
  { name: 'Marshall Acton II Bluetooth Speaker', category: 'Audio', buy: [120, 180], sell: [160, 240] },
  { name: 'IKEA Norraker Bench Birch', category: 'Furniture', buy: [60, 95], sell: [85, 135] },
] satisfies CatalogItem[]

async function main() {
  await supabase.auth.signUp({ email: demoEmail, password: demoPassword })

  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    })

  if (signInError || !signInData.user) {
    throw signInError ?? new Error('Unable to sign in demo user')
  }

  const userId = signInData.user.id

  if (!userId) {
    throw new Error('Demo user ID is missing before seeding')
  }

  const items = buildDemoItems(userId)
  const files = buildDemoFiles(items, userId)
  validateSeed(items, files, userId)

  const { error: deleteFilesError } = await supabase
    .from('item_files')
    .delete()
    .eq('user_id', userId)

  if (deleteFilesError) {
    throw deleteFilesError
  }

  const { error: deleteItemsError } = await supabase
    .from('items')
    .delete()
    .eq('user_id', userId)

  if (deleteItemsError) {
    throw deleteItemsError
  }

  const { error: insertItemsError } = await supabase.from('items').insert(items)

  if (insertItemsError) {
    throw insertItemsError
  }

  const { error: insertFilesError } = await supabase.from('item_files').insert(files)

  if (insertFilesError) {
    throw insertFilesError
  }

  console.log(`Seeded ${items.length} demo items for ${demoEmail}`)
  console.log(`Seeded ${files.length} demo image records`)
  console.log(`Demo user UUID: ${userId}`)
}

function buildDemoItems(userId: string) {
  const rows: DemoItem[] = []
  let index = 0

  for (const bundle of bundleSpecs) {
    const parentId = randomUUID()
    const parentStatus = statusForIndex(index)
    const children = bundle.children.map((child, childIndex) =>
      makeItem({
        buyPrice: child.allocatedBuy,
        bundleId: parentId,
        catalog: child,
        index: index + childIndex + 1,
        status: statusForIndex(index + childIndex + 1),
        userId,
      }),
    )

    rows.push(
      makeBundleParent({
        bundle,
        children,
        index,
        status: parentStatus,
        tsid: parentId,
        userId,
      }),
    )
    rows.push(...children)
    index += children.length + 1
  }

  for (const catalog of standaloneCatalog) {
    rows.push(
      makeItem({
        catalog,
        index,
        status: statusForIndex(index),
        userId,
      }),
    )
    index += 1
  }

  if (rows.length !== 100) {
    throw new Error(`Expected 100 demo items, got ${rows.length}`)
  }

  return rows
}

function makeBundleParent({
  bundle,
  children,
  index,
  status,
  tsid,
  userId,
}: {
  bundle: BundleSpec
  children: DemoItem[]
  index: number
  status: ItemStatus
  tsid: string
  userId: string
}): DemoItem {
  const soldChildren = children.filter((child) => child.status === 'sold')
  const boughtAt = dateForIndex(index)
  const soldAt =
    status === 'sold'
      ? latestDate(soldChildren.map((child) => child.sold_at).filter(Boolean))
      : null

  return {
    tsid,
    user_id: userId,
    name: bundle.name,
    category: bundle.category,
    condition: conditions[index % conditions.length],
    buy_price: bundle.buy,
    sell_price: status === 'sold' ? 0 : null,
    buy_platform: buyingPlatforms[index % buyingPlatforms.length],
    sell_platform: status === 'sold' ? sellingPlatforms[index % sellingPlatforms.length] : null,
    status,
    bought_at: boughtAt,
    sold_at: soldAt ?? (status === 'sold' ? addDays(boughtAt, 34 + (index % 20)) : null),
    notes: 'Bundle parent for total purchase price. Children carry individual resale values.',
    bundle_id: null,
    is_bundle_parent: true,
  }
}

function makeItem({
  bundleId = null,
  buyPrice,
  catalog,
  index,
  status,
  userId,
}: {
  bundleId?: string | null
  buyPrice?: number
  catalog: CatalogItem
  index: number
  status: ItemStatus
  userId: string
}): DemoItem {
  const boughtAt = dateForIndex(index)
  const soldAt = status === 'sold' ? addDays(boughtAt, 7 + (index % 47)) : null
  const effectiveBuyPrice = buyPrice ?? priceFromRange(catalog.buy, index)
  const sellPrice =
    status === 'sold' || status === 'listed'
      ? priceFromRange(catalog.sell, index + 3)
      : null

  return {
    tsid: randomUUID(),
    user_id: userId,
    name: catalog.name,
    category: catalog.category,
    condition: catalog.condition ?? conditions[index % conditions.length],
    buy_price: roundMoney(effectiveBuyPrice),
    sell_price: sellPrice,
    buy_platform: buyingPlatforms[index % buyingPlatforms.length],
    sell_platform: sellPrice ? sellingPlatforms[index % sellingPlatforms.length] : null,
    status,
    bought_at: boughtAt,
    sold_at: soldAt,
    notes: noteFor(status, index),
    bundle_id: bundleId,
    is_bundle_parent: false,
  }
}

function buildDemoFiles(items: DemoItem[], userId: string) {
  return items.map<DemoFile>((item, index) => {
    const categorySlug = slugify(item.category)
    const imageName = `${String(index + 1).padStart(3, '0')}-${slugify(item.name)}.webp`
    const filePath = `/demo-items/${categorySlug}/${imageName}`
    const localPath = resolve(process.cwd(), 'public', filePath.slice(1))

    return {
      item_id: item.tsid,
      user_id: userId,
      file_path: filePath,
      file_type: 'image',
      original_name: imageName,
      mime_type: 'image/webp',
      size_bytes: existsSync(localPath) ? statSync(localPath).size : 0,
    }
  })
}

function validateSeed(items: DemoItem[], files: DemoFile[], userId: string) {
  if (!userId) {
    throw new Error('Demo user ID is required')
  }

  const parentIds = new Set(
    items.filter((item) => item.is_bundle_parent).map((item) => item.tsid),
  )
  const filesByItemId = new Set(files.map((file) => file.item_id))
  const statusCounts = countBy(items, (item) => item.status)

  assertEqual(items.length, 100, 'Seed must contain exactly 100 items')
  assertEqual(files.length, items.length, 'Every item must have one demo image record')
  assertEqual(statusCounts.sold ?? 0, 40, 'Seed must contain 40 sold items')
  assertEqual(statusCounts.holding ?? 0, 30, 'Seed must contain 30 holding items')
  assertEqual(statusCounts.keeper ?? 0, 20, 'Seed must contain 20 keeper items')
  assertEqual(statusCounts.listed ?? 0, 10, 'Seed must contain 10 listed items')

  for (const bundle of bundleSpecs) {
    const allocatedTotal = roundMoney(
      bundle.children.reduce((sum, child) => sum + child.allocatedBuy, 0),
    )
    if (allocatedTotal !== bundle.buy) {
      throw new Error(
        `Bundle ${bundle.name} children allocate ${allocatedTotal}, expected ${bundle.buy}`,
      )
    }
  }

  for (const item of items) {
    if (item.user_id !== userId) {
      throw new Error(`Item ${item.name} does not belong to the demo user`)
    }

    if (!filesByItemId.has(item.tsid)) {
      throw new Error(`Item ${item.name} is missing a demo image reference`)
    }

    if (item.status === 'sold' && item.sell_price === null) {
      throw new Error(`Sold item ${item.name} has no sell price`)
    }

    if (item.status !== 'sold' && item.sold_at) {
      throw new Error(`Unsold item ${item.name} has sold_at set`)
    }

    if (isCommonGame(item) && (item.sell_price ?? 0) > 80) {
      throw new Error(`Common game ${item.name} has unrealistic sell price`)
    }

    if (isCommonConsumerItem(item) && roi(item) > 150) {
      throw new Error(`Common consumer item ${item.name} has ROI over 150%`)
    }

    if (item.bundle_id && !parentIds.has(item.bundle_id)) {
      throw new Error(`Bundle child ${item.name} has an invalid bundle_id`)
    }

    if (item.is_bundle_parent && item.bundle_id) {
      throw new Error(`Bundle parent ${item.name} should not have bundle_id set`)
    }
  }

  for (const bundle of bundleSpecs) {
    const parent = items.find((item) => item.name === bundle.name)
    if (!parent?.is_bundle_parent) {
      throw new Error(`Bundle parent ${bundle.name} is missing or invalid`)
    }
  }

  for (const file of files) {
    const localPath = resolve(process.cwd(), 'public', file.file_path.slice(1))

    if (!file.file_path.endsWith('.webp')) {
      throw new Error(`Demo image ${file.file_path} must be a WebP file`)
    }

    if (!existsSync(localPath)) {
      throw new Error(`Demo image file is missing: ${file.file_path}`)
    }

    if (statSync(localPath).size > 150 * 1024) {
      throw new Error(`Demo image exceeds 150kb: ${file.file_path}`)
    }
  }
}

function statusForIndex(index: number): ItemStatus {
  const slot = index % 10
  if (slot < 4) return 'sold'
  if (slot < 7) return 'holding'
  if (slot < 9) return 'keeper'
  return 'listed'
}

function priceFromRange(range: PriceRange, index: number) {
  const [min, max] = range
  const ratio = ((index * 37 + 19) % 100) / 100
  return roundMoney(min + (max - min) * ratio)
}

function dateForIndex(index: number) {
  const start = new Date('2023-01-06T12:00:00.000Z').getTime()
  const end = new Date().getTime()
  return new Date(start + ((end - start) * index) / 99).toISOString()
}

function addDays(date: string, days: number) {
  return new Date(new Date(date).getTime() + days * 86400000).toISOString()
}

function latestDate(dates: Array<string | null>) {
  const validDates = dates.filter((date): date is string => Boolean(date))
  if (validDates.length === 0) {
    return null
  }

  return validDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function noteFor(status: ItemStatus, index: number) {
  const options = notes[status]
  return options[index % options.length]
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function roi(item: DemoItem) {
  if (!item.sell_price || item.buy_price <= 0) {
    return 0
  }

  return (item.sell_price - item.buy_price) / item.buy_price * 100
}

function isCommonGame(item: DemoItem) {
  if (item.category !== 'Gaming') {
    return false
  }

  const name = item.name.toLowerCase()
  const isHardware =
    name.includes('console') ||
    name.includes('switch oled') ||
    name.includes('steam deck') ||
    name.includes('game boy')
  const isCollector = name.includes('soulsilver')

  return !isHardware && !isCollector
}

function isCommonConsumerItem(item: DemoItem) {
  return ['Gaming', 'Electronics', 'Audio', 'Cameras'].includes(item.category)
}

function countBy<T extends string>(items: DemoItem[], getKey: (item: DemoItem) => T) {
  return items.reduce<Record<T, number>>((counts, item) => {
    const key = getKey(item)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {} as Record<T, number>)
}

function assertEqual(actual: number, expected: number, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, got ${actual}`)
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function loadEnv(fileName: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), fileName), 'utf8')
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match) {
        continue
      }

      const [, key, rawValue] = match
      if (process.env[key]) {
        continue
      }

      process.env[key] = rawValue.replace(/^["']|["']$/g, '')
    }
  } catch {
    return
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
