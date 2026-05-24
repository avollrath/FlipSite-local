import { describe, expect, it } from 'vitest'
import {
 buildBundleChildSavePlan,
 createEmptyBundleChild,
 getInitialBundleChildren,
 normalizeBundleChild,
 normalizeBundleChildren,
} from '@/components/items/bundleChildMapping'
import type { NewItem } from '@/hooks/useItems'
import type { Item } from '@/types'

const parent: Item = {
 tsid: 'bundle-1',
 user_id: 'user-1',
 name: 'Console bundle',
 category: 'Games',
 condition: 'Good',
 buy_price: 100,
 sell_price: null,
 buy_platform: 'Market',
 sell_platform: null,
 status: 'holding',
 bought_at: '2026-05-01T00:00:00.000Z',
 sold_at: null,
 notes: null,
 created_at: '2026-05-01T00:00:00.000Z',
 bundle_id: null,
 is_bundle_parent: true,
}

const existingChild: Item = {
 ...parent,
 tsid: 'child-1',
 name: 'Game',
 buy_price: 0,
 status: 'listed',
 bundle_id: parent.tsid,
 is_bundle_parent: false,
}

const parentPayload: NewItem = {
 name: parent.name,
 category: parent.category,
 condition: parent.condition,
 buy_price: parent.buy_price,
 sell_price: null,
 buy_platform: parent.buy_platform,
 sell_platform: null,
 status: parent.status,
 bought_at: parent.bought_at,
 sold_at: null,
 notes: null,
 bundle_id: null,
 is_bundle_parent: true,
}

describe('bundle child mapping helpers', () => {
 it('maps existing bundle children into editable form rows', () => {
 expect(getInitialBundleChildren(parent, [parent, existingChild])).toEqual([
  {
  id: 'child-1',
  tsid: 'child-1',
  name: 'Game',
  category: 'Games',
  condition: 'Good',
  status: 'listed',
  buy_price: '',
  },
 ])
 expect(getInitialBundleChildren({ ...parent, is_bundle_parent: false }, [existingChild]))
 .toEqual([])
 })

 it('creates empty bundle child form rows with injected ids', () => {
 expect(createEmptyBundleChild(() => 'local-1')).toEqual({
  id: 'local-1',
  name: '',
  category: '',
  condition: 'Good',
  status: 'holding',
  buy_price: '',
 })
 })

 it('normalizes bundle children and skips unnamed rows', () => {
 expect(
  normalizeBundleChildren([
  {
   id: 'local-1',
   name: ' Game ',
   category: ' Games ',
   condition: 'Like New',
   status: 'holding',
   buy_price: '12,50',
  },
  {
   id: 'local-2',
   name: ' ',
   category: 'Ignored',
   condition: 'Good',
   status: 'holding',
   buy_price: '50',
  },
  ]),
 ).toEqual([
  {
  name: 'Game',
  category: 'Games',
  condition: 'Like new',
  status: 'holding',
  buy_price: 12.5,
  notes: null,
  },
 ])

 expect(
  normalizeBundleChild({
  id: 'local-3',
  name: 'Cable',
  category: '',
  condition: 'Good',
  status: 'holding',
  buy_price: 'invalid',
  }),
 ).toMatchObject({ name: 'Cable', buy_price: 0 })
 })

 it('plans existing child updates', () => {
 expect(
  buildBundleChildSavePlan({
  children: [
   {
   id: 'child-1',
   tsid: 'child-1',
   name: ' Updated Game ',
   category: ' Games ',
   condition: 'Like New',
   status: 'listed',
   buy_price: '5',
   },
  ],
  parent: parentPayload,
  parentTsid: parent.tsid,
  }),
 ).toEqual({
  creates: [],
  updates: [
  {
   tsid: 'child-1',
   updates: {
   buy_price: 5,
   category: 'Games',
   condition: 'Like new',
   name: 'Updated Game',
   status: 'listed',
   },
  },
  ],
 })
 })

 it('plans new child creates with inherited parent fields', () => {
 expect(
  buildBundleChildSavePlan({
  children: [
   {
   id: 'local-1',
   name: 'Game',
   category: 'Games',
   condition: 'Good',
   status: 'holding',
   buy_price: '',
   },
  ],
  parent: parentPayload,
  parentTsid: parent.tsid,
  }),
 ).toEqual({
  creates: [
  {
   name: 'Game',
   category: 'Games',
   condition: 'Good',
   status: 'holding',
   buy_price: 0,
   notes: null,
   bundle_id: 'bundle-1',
   bought_at: parentPayload.bought_at,
   is_bundle_parent: false,
   buy_platform: 'Market',
   sell_platform: null,
   sell_price: null,
   sold_at: null,
  },
  ],
  updates: [],
 })
 })

 it('does not plan deletes for omitted existing children', () => {
 expect(
  buildBundleChildSavePlan({
  children: [],
  parent: parentPayload,
  parentTsid: parent.tsid,
  }),
 ).toEqual({ creates: [], updates: [] })
 })
})
