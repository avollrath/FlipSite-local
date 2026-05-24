import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Download,
  Edit3,
  Link2,
  LayoutGrid,
  LayoutList,
  PackageOpen,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "react-router-dom";
import { ImageWithSkeleton } from "@/components/ui/ImageWithSkeleton";
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import {
  getFirstItemImageThumbnails,
  type ItemImageThumbnail,
} from "@/lib/itemFiles";
import {
  calculateItemProfit,
  calculateItemROI,
  calculateItemSellValue,
  cn,
  formatCurrency,
  formatDate,
  getBuyPlatform,
  getEffectiveItemStatus,
  getSellPlatform,
  getStatusLabel,
  isKeepingItem,
} from "@/lib/utils";
import {
  getActiveBundleIds,
  getChildrenByBundle,
  getVisibleItems,
  getVisibleRows,
  uniqueItemValues,
  type BundleFilter,
  type SortKey,
  type SortState,
} from "@/components/items/itemListModel";
import type { Item, ItemStatus } from "@/types";

type DrawerState =
  | { open: false; mode: "add"; item: null }
  | { open: true; mode: "add"; item: null }
  | { open: true; mode: "edit"; item: Item };

type ViewMode = "list" | "gallery";

const allStatuses = ["all", "holding", "listed", "sold", "keeper"] as const;
const galleryThumbnailSize = 420;
const galleryGap = 12;
const listThumbnailSize = 80;
const bundleChildAccountingNote = "Included in bundle parent";
const bundleChildExportNote =
  "Revenue detail; profit and ROI are included in bundle parent";
const tableColumns: Array<{ key: SortKey | "actions"; label: string }> = [
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition" },
  { key: "buy_price", label: "Buy Price" },
  { key: "sell_price", label: "Sell Price" },
  { key: "profit", label: "Profit" },
  { key: "roi", label: "ROI %" },
  { key: "buy_platform", label: "Bought from" },
  { key: "sell_platform", label: "Sold on" },
  { key: "status", label: "Status" },
  { key: "bought_at", label: "Date Bought" },
  { key: "sold_at", label: "Date Sold" },
  { key: "actions", label: "Actions" },
];
const gallerySortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "bought_at", label: "Bought date" },
  { key: "sold_at", label: "Sold date" },
  { key: "name", label: "Name" },
  { key: "category", label: "Category" },
  { key: "condition", label: "Condition" },
  { key: "buy_price", label: "Buy price" },
  { key: "sell_price", label: "Sell price" },
  { key: "profit", label: "Profit" },
  { key: "roi", label: "ROI %" },
  { key: "buy_platform", label: "Bought from" },
  { key: "sell_platform", label: "Sold on" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created date" },
];

export function Items() {
  const { data: items = [], isLoading } = useItems();
  const deleteItem = useDeleteItem();
  const pageRef = useRef<HTMLElement | null>(null);
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const queryStatus = getQueryStatus(searchParams.get("status"));
  const queryBundleFilter = getQueryBundleFilter(searchParams.get("bundles"));
  const queryInventoryOnly = searchParams.get("inventory") === "1";
  const queryItemId = itemId ?? searchParams.get("item") ?? "";
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    getInitialViewMode(),
  );
  const [statusFilter, setStatusFilter] = useState<
    (typeof allStatuses)[number]
  >(queryStatus ?? "all");
  const [buyPlatformFilter, setBuyPlatformFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [bundleFilter, setBundleFilter] =
    useState<BundleFilter>(queryBundleFilter);
  const [inventoryOnly, setInventoryOnly] = useState(queryInventoryOnly);
  const [hasImage, setHasImage] = useState(false);
  const [focusedItemId] = useState(queryItemId);
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(
    () => new Set(),
  );
  const [sort, setSort] = useState<SortState>({
    key: "bought_at",
    direction: "desc",
  });
  const [drawer, setDrawer] = useState<DrawerState>({
    open: false,
    mode: "add",
    item: null,
  });
  const [galleryLayout, setGalleryLayout] = useState(() => ({
    cardSize: 200,
    columns: 1,
    width: 200,
  }));
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);

  const buyPlatforms = useMemo(
    () => uniqueItemValues(items.map((item) => getBuyPlatform(item))),
    [items],
  );
  const categories = useMemo(
    () => uniqueItemValues(items.map((item) => item.category)),
    [items],
  );
  const childrenByBundle = useMemo(() => getChildrenByBundle(items), [items]);
  const activeBundleIds = useMemo(
    () => getActiveBundleIds(items, childrenByBundle),
    [childrenByBundle, items],
  );

  const visibleItems = useMemo(() => {
    return getVisibleItems({
      activeBundleIds,
      childrenByBundle,
      filters: {
        bundleFilter,
        buyPlatformFilter,
        categoryFilter,
        focusedItemId,
        inventoryOnly,
        search,
        statusFilter,
      },
      items,
      sort,
    });
  }, [
    activeBundleIds,
    bundleFilter,
    categoryFilter,
    childrenByBundle,
    focusedItemId,
    inventoryOnly,
    items,
    buyPlatformFilter,
    search,
    sort,
    statusFilter,
  ]);

  const visibleRows = useMemo(() => {
    return getVisibleRows({
      childrenByBundle,
      expandedBundles,
      filters: {
        bundleFilter,
        buyPlatformFilter,
        categoryFilter,
        focusedItemId,
        inventoryOnly,
        search,
        statusFilter,
      },
      visibleItems,
    });
  }, [
    bundleFilter,
    categoryFilter,
    childrenByBundle,
    expandedBundles,
    focusedItemId,
    inventoryOnly,
    buyPlatformFilter,
    search,
    statusFilter,
    visibleItems,
  ]);
  const visibleRowItemIds = useMemo(
    () => visibleRows.map(({ item }) => item.tsid),
    [visibleRows],
  );
  const thumbnailItemIds = useMemo(
    () =>
      viewMode === "gallery"
        ? visibleItems.map((item) => item.tsid)
        : visibleRowItemIds,
    [viewMode, visibleItems, visibleRowItemIds],
  );
  const thumbnailSize =
    viewMode === "gallery" ? galleryThumbnailSize : listThumbnailSize;
  const { data: thumbnailByItemId = new Map<string, ItemImageThumbnail>() } =
    useQuery({
      queryKey: ["item-image-thumbnails", thumbnailSize, thumbnailItemIds],
      enabled: thumbnailItemIds.length > 0,
      staleTime: 1000 * 60 * 30,
      queryFn: async () => {
        const thumbnails = await getFirstItemImageThumbnails(thumbnailItemIds, {
          size: thumbnailSize,
        });

        return new Map(
          thumbnails.map((thumbnail) => [thumbnail.item_id, thumbnail]),
        );
      },
    });

  const displayedItems = useMemo(() => {
    if (viewMode !== "gallery" || !hasImage) {
      return visibleItems;
    }

    return visibleItems.filter((item) => {
      const imageUrl = thumbnailByItemId.get(item.tsid)?.signed_url;
      return Boolean(imageUrl?.trim());
    });
  }, [hasImage, thumbnailByItemId, viewMode, visibleItems]);

  useEffect(() => {
    localStorage.setItem("flipsite-items-view", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (viewMode !== "gallery") {
      document.documentElement.style.removeProperty("--items-gallery-width");
      return;
    }

    function updateGalleryLayout() {
      const availableWidth = pageRef.current?.clientWidth ?? 0;

      if (!availableWidth) {
        return;
      }

      const cardSize = getGalleryCardSize();
      const columns = Math.max(
        1,
        Math.floor((availableWidth + galleryGap) / (cardSize + galleryGap)),
      );
      const width = columns * cardSize + (columns - 1) * galleryGap;

      setGalleryLayout((currentLayout) =>
        currentLayout.cardSize === cardSize &&
        currentLayout.columns === columns &&
        currentLayout.width === width
          ? currentLayout
          : { cardSize, columns, width },
      );
      document.documentElement.style.setProperty(
        "--items-gallery-width",
        `${width}px`,
      );
    }

    updateGalleryLayout();

    const resizeObserver = new ResizeObserver(updateGalleryLayout);

    if (pageRef.current) {
      resizeObserver.observe(pageRef.current);
    }

    window.addEventListener("resize", updateGalleryLayout);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateGalleryLayout);
      document.documentElement.style.removeProperty("--items-gallery-width");
    };
  }, [viewMode]);

  function openAddDrawer() {
    setDrawer({ open: true, mode: "add", item: null });
  }

  function openEditDrawer(item: Item) {
    setDrawer({ open: true, mode: "edit", item });
  }

  function closeDrawer(open: boolean) {
    if (!open) {
      setDrawer({ open: false, mode: "add", item: null });
    }
  }

  function updateSort(key: SortKey) {
    setSort((currentSort) => ({
      key,
      direction:
        currentSort.key === key && currentSort.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function updateGallerySortKey(key: SortKey) {
    setSort((currentSort) => ({
      key,
      direction: currentSort.key === key ? currentSort.direction : "desc",
    }));
  }

  function updateSortDirection(direction: SortState["direction"]) {
    setSort((currentSort) => ({
      ...currentSort,
      direction,
    }));
  }

  function updateViewMode(nextViewMode: ViewMode) {
    if (nextViewMode !== "gallery") {
      setHasImage(false);
    }

    setViewMode(nextViewMode);
  }

  function toggleBundle(tsid: string) {
    setExpandedBundles((current) => {
      const next = new Set(current);

      if (next.has(tsid)) {
        next.delete(tsid);
      } else {
        next.add(tsid);
      }

      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    await deleteItem.mutateAsync(deleteTarget.tsid);
    setDeleteTarget(null);
  }

  function exportVisibleItems() {
    const rows = displayedItems.map((item) => {
      const isKeeper = isKeepingItem(item);
      const isBundleChild = Boolean(item.bundle_id && !item.is_bundle_parent);
      const profit = calculateItemProfit(item, items);
      const roi = calculateItemROI(item, items);

      return {
        "Record Type": isBundleChild
          ? "Bundle child"
          : item.is_bundle_parent
            ? "Bundle parent"
            : "Standalone",
        Name: item.name,
        Category: item.category,
        Condition: item.condition,
        "Buy Price": item.buy_price,
        "Sell Price": isKeeper ? "" : calculateItemSellValue(item, items),
        Profit: isKeeper ? "" : (profit ?? ""),
        "ROI %": isKeeper || roi === null ? "" : roi.toFixed(2),
        "Bought from": getBuyPlatform(item),
        "Sold on": getSellPlatform(item),
        Status: getStatusLabel(getEffectiveItemStatus(item, items)),
        "Date Bought": formatDate(item.bought_at),
        "Date Sold": formatDate(item.sold_at),
        "Accounting Note": isBundleChild ? bundleChildExportNote : "",
        Notes: item.notes ?? "",
      };
    });

    downloadCsv(rows, "flipsite-items.csv");
  }

  const emptyAllItems = !isLoading && items.length === 0;

  return (
    <section ref={pageRef}>
      <div
        className="flex flex-col gap-4"
        style={
          viewMode === "gallery" ? { maxWidth: galleryLayout.width } : undefined
        }
      >
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">My Items</h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm text-base font-semibold transition border rounded-lg border-border-base bg-card hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={exportVisibleItems}
              disabled={displayedItems.length === 0}
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              Export CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition rounded-lg shadow-lg bg-accent text-accent-fg shadow-accent/20 hover:bg-accent/90"
              onClick={openAddDrawer}
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Item
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg shadow-sm bg-card">
          <label className="relative block min-w-[180px] max-w-[320px] flex-[1_1_220px]">
            <Search
              className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              className={controlClassName + " min-w-0 truncate pl-9"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search items"
            />
          </label>
          <ViewToggle value={viewMode} onChange={updateViewMode} />
          {viewMode === "gallery" ? (
            <GallerySortControl
              sort={sort}
              onDirectionChange={updateSortDirection}
              onKeyChange={updateGallerySortKey}
            />
          ) : null}

          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(value as (typeof allStatuses)[number])
            }
            options={allStatuses.map((status) => ({
              value: status,
              label: status === "all" ? "All Statuses" : getStatusLabel(status),
            }))}
            className="min-w-[150px] flex-[0_1_180px]"
          />
          <FilterSelect
            label="Bought from"
            value={buyPlatformFilter}
            onChange={setBuyPlatformFilter}
            options={[
              { value: "all", label: "All Sources" },
              ...buyPlatforms.map((platform) => ({
                value: platform,
                label: platform,
              })),
            ]}
            className="min-w-[150px] flex-[0_1_180px]"
          />
          <FilterSelect
            label="Category"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: "all", label: "All Categories" },
              ...categories.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
            className="min-w-[160px] max-w-[240px] flex-[0_1_220px]"
          />
          <label className="flex h-11 flex-[0_0_auto] items-center gap-2 whitespace-nowrap rounded-lg border border-layout bg-card px-3 text-sm font-medium text-base ">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border-base text-accent focus:ring-accent"
              checked={bundleFilter !== "none"}
              onChange={(event) =>
                setBundleFilter(event.target.checked ? "only" : "none")
              }
            />
            Bundles only
          </label>
          {viewMode === "gallery" ? (
            <label className="flex h-11 flex-[0_0_auto] items-center gap-2 whitespace-nowrap rounded-lg border border-layout bg-card px-3 text-sm font-medium text-base ">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border-base text-accent focus:ring-accent"
                checked={hasImage}
                onChange={(event) => setHasImage(event.target.checked)}
              />
              Image
            </label>
          ) : null}
          <label className="flex h-11 flex-[0_0_auto] items-center gap-2 whitespace-nowrap rounded-lg border border-layout bg-card px-3 text-sm font-medium text-base ">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border-base text-accent focus:ring-accent"
              checked={inventoryOnly}
              onChange={(event) => setInventoryOnly(event.target.checked)}
            />
            Inventory
          </label>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : emptyAllItems ? (
        <EmptyState onAdd={openAddDrawer} />
      ) : (
        <>
          {viewMode === "gallery" ? (
            <GalleryView
              allItems={items}
              items={displayedItems}
              layout={galleryLayout}
              onEdit={openEditDrawer}
              thumbnailByItemId={thumbnailByItemId}
            />
          ) : (
            <>
              <div className="hidden mt-6 overflow-hidden rounded-lg shadow-sm bg-card md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1160px] text-left text-sm">
                    <thead className="text-xs uppercase border-b border-subtle bg-surface text-muted bg-surface-2/60 ">
                      <tr>
                        {tableColumns.map((column) => (
                          <th
                            key={column.key}
                            className="px-4 py-3 font-semibold"
                          >
                            {column.key === "actions" ? (
                              column.label
                            ) : (
                              <button
                                type="button"
                                className="flex items-center gap-1 transition hover:text-accent"
                                onClick={() =>
                                  updateSort(column.key as SortKey)
                                }
                              >
                                {column.label}
                                <SortIcon
                                  active={sort.key === column.key}
                                  direction={sort.direction}
                                />
                              </button>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {visibleRows.map(({ item, isChild }) => (
                        <ItemRow
                          key={item.tsid}
                          item={item}
                          childCount={
                            childrenByBundle.get(item.tsid)?.length ?? 0
                          }
                          isChild={isChild}
                          isExpanded={expandedBundles.has(item.tsid)}
                          onEdit={() => openEditDrawer(item)}
                          onDelete={() => setDeleteTarget(item)}
                          onToggleBundle={() => toggleBundle(item.tsid)}
                          thumbnail={thumbnailByItemId.get(item.tsid)}
                          allItems={items}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 mt-6 md:hidden">
                {visibleRows.map(({ item, isChild }) => (
                  <ItemCard
                    key={item.tsid}
                    item={item}
                    childCount={childrenByBundle.get(item.tsid)?.length ?? 0}
                    isChild={isChild}
                    isExpanded={expandedBundles.has(item.tsid)}
                    onEdit={() => openEditDrawer(item)}
                    onToggleBundle={() => toggleBundle(item.tsid)}
                    thumbnail={thumbnailByItemId.get(item.tsid)}
                    allItems={items}
                  />
                ))}
              </div>
            </>
          )}

          {displayedItems.length === 0 ? <NoResults /> : null}
        </>
      )}

      <ItemDrawer
        open={drawer.open}
        mode={drawer.mode}
        item={drawer.item}
        onEditItem={openEditDrawer}
        onOpenChange={closeDrawer}
      />
      <DeleteConfirmDialog
        item={deleteTarget}
        isDeleting={deleteItem.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}

function ItemRow({
  childCount,
  isChild,
  isExpanded,
  item,
  onDelete,
  onEdit,
  onToggleBundle,
  thumbnail,
  allItems,
}: {
  childCount: number;
  isChild: boolean;
  isExpanded: boolean;
  item: Item;
  onDelete: () => void;
  onEdit: () => void;
  onToggleBundle: () => void;
  thumbnail: ItemImageThumbnail | undefined;
  allItems: Item[];
}) {
  const isKeeper = isKeepingItem(item);
  const sellValue = calculateItemSellValue(item, allItems);
  const profit = calculateItemProfit(item, allItems);
  const roi = calculateItemROI(item, allItems);

  return (
    <tr
      className={`cursor-pointer transition hover:bg-accent-soft/70 ${
        isChild ? "bg-surface/70 bg-surface-2/40" : ""
      }`}
      onClick={onEdit}
    >
      <td className="px-4 py-4 align-middle text-base font-medium ">
        <div className={`flex items-center gap-2 ${isChild ? "pl-8" : ""}`}>
          {item.is_bundle_parent ? (
            <button
              type="button"
              className="p-1 transition rounded text-muted hover:bg-surface-2 hover:text-accent"
              onClick={(event) => {
                event.stopPropagation();
                onToggleBundle();
              }}
              aria-label={isExpanded ? "Collapse bundle" : "Expand bundle"}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          ) : null}
          {isChild ? (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
              <Link2
                className="shrink-0 text-accent"
                aria-hidden="true"
                size={16}
                strokeWidth={2}
              />
            </span>
          ) : null}
          <ItemThumbnail name={item.name} thumbnail={thumbnail} />
          <span>{item.name}</span>
          {item.is_bundle_parent ? <BundleBadge count={childCount} /> : null}
        </div>
      </td>
      <td className="px-4 py-4 text-muted ">{item.category || "--"}</td>
      <td className="px-4 py-4 text-muted ">{item.condition}</td>
      <td className="px-4 py-4">{formatCurrency(item.buy_price)}</td>
      <td className={isKeeper ? "px-4 py-4 text-muted" : "px-4 py-4"}>
        {isKeeper ? (
          "--"
        ) : isChild ? (
          <div>
            <span>{formatCurrency(sellValue)}</span>
            <span className="block text-xs font-medium text-muted">
              Revenue
            </span>
          </div>
        ) : (
          formatCurrency(sellValue)
        )}
      </td>
      <td
        className={
          isKeeper
            ? "px-4 py-4 font-semibold text-muted"
            : metricCellClassName(profit)
        }
      >
        {isChild ? (
          <span className="text-xs font-medium text-muted">
            {bundleChildAccountingNote}
          </span>
        ) : isKeeper || profit === null ? (
          "--"
        ) : (
          formatCurrency(profit)
        )}
      </td>
      <td
        className={
          isKeeper
            ? "px-4 py-4 font-semibold text-muted"
            : metricCellClassName(roi)
        }
      >
        {isChild ? (
          <span className="text-xs font-medium text-muted">
            {bundleChildAccountingNote}
          </span>
        ) : isKeeper || roi === null ? (
          "--"
        ) : (
          `${roi.toFixed(1)}%`
        )}
      </td>
      <td className="px-4 py-4 text-muted ">{getBuyPlatform(item) || "--"}</td>
      <td className="px-4 py-4 text-muted ">{getSellPlatform(item) || "--"}</td>
      <td className="px-4 py-4">
        <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
      </td>
      <td className="px-4 py-4 text-muted ">{formatDate(item.bought_at)}</td>
      <td className="px-4 py-4 text-muted ">
        {formatDate(item.sold_at) || "--"}
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 transition rounded-lg text-muted hover:bg-surface-2 hover:text-accent"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            aria-label={`Edit ${item.name}`}
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="p-2 transition rounded-lg text-muted hover:bg-negative/10 hover:text-negative"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            aria-label={`Delete ${item.name}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function DeleteConfirmDialog({
  isDeleting,
  item,
  onCancel,
  onConfirm,
}: {
  isDeleting: boolean;
  item: Item | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!item) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid px-4 place-items-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md p-6 rounded-lg shadow-2xl animate-soft-pop bg-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-item-title"
      >
        <div className="flex items-start gap-4">
          <div className="grid rounded-lg h-11 w-11 shrink-0 place-items-center bg-negative/15 text-negative ">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="delete-item-title"
              className="text-base text-lg font-semibold "
            >
              Delete item?
            </h3>
            <p className="mt-2 text-sm text-muted ">
              This will delete "{item.name}". This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-3 mt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-border-base px-4 py-2.5 text-sm font-semibold text-base transition hover:bg-surface-2"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-negative px-4 py-2.5 text-sm font-semibold text-accent-fg transition hover:bg-negative/90 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ItemCard({
  childCount,
  isChild,
  isExpanded,
  item,
  onEdit,
  onToggleBundle,
  thumbnail,
  allItems,
}: {
  childCount: number;
  isChild: boolean;
  isExpanded: boolean;
  item: Item;
  onEdit: () => void;
  onToggleBundle: () => void;
  thumbnail: ItemImageThumbnail | undefined;
  allItems: Item[];
}) {
  const isKeeper = isKeepingItem(item);
  const sellValue = calculateItemSellValue(item, allItems);
  const profit = calculateItemProfit(item, allItems);
  const roi = calculateItemROI(item, allItems);

  return (
    <button
      type="button"
      className={`rounded-lg bg-card p-4 text-left shadow-sm transition hover:shadow-md ${
        isChild ? "ml-5 border border-accent/30" : ""
      }`}
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start min-w-0 gap-3">
          <ItemThumbnail name={item.name} thumbnail={thumbnail} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold ">
              <span className="inline-flex items-center gap-2">
                {isChild ? (
                  <Link2 className="w-4 h-4 text-accent" aria-hidden="true" />
                ) : null}
                {item.name}
                {item.is_bundle_parent ? (
                  <BundleBadge count={childCount} />
                ) : null}
              </span>
            </h3>
            <p className="mt-1 text-sm text-muted ">
              {item.category || "Uncategorized"} -{" "}
              {getBuyPlatform(item) || "--"}
            </p>
          </div>
        </div>
        <StatusBadge status={getEffectiveItemStatus(item, allItems)} />
      </div>
      {item.is_bundle_parent ? (
        <button
          type="button"
          className="inline-flex items-center gap-2 px-2 py-1 mt-3 text-sm font-medium transition rounded-lg text-accent hover:bg-accent-soft"
          onClick={(event) => {
            event.stopPropagation();
            onToggleBundle();
          }}
        >
          {isExpanded ? "Hide bundle items" : "Show bundle items"}
        </button>
      ) : null}
      <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
        <MobileMetric label="Buy" value={formatCurrency(item.buy_price)} />
        <MobileMetric
          label={isChild ? "Revenue" : "Sell"}
          value={isKeeper ? "--" : formatCurrency(sellValue)}
        />
        <MobileMetric
          label="Profit"
          value={
            isChild
              ? bundleChildAccountingNote
              : isKeeper || profit === null
                ? "--"
                : formatCurrency(profit)
          }
          tone={isKeeper ? null : profit}
        />
        <MobileMetric
          label="ROI"
          value={
            isChild
              ? bundleChildAccountingNote
              : isKeeper || roi === null
                ? "--"
                : `${roi.toFixed(1)}%`
          }
          tone={isKeeper ? null : roi}
        />
        <MobileMetric label="Bought" value={formatDate(item.bought_at)} />
        <MobileMetric label="Sold" value={formatDate(item.sold_at) || "--"} />
      </div>
    </button>
  );
}

function ViewToggle({
  onChange,
  value,
}: {
  onChange: (value: ViewMode) => void;
  value: ViewMode;
}) {
  return (
    <div className="flex flex-[0_0_auto] items-center gap-0.5 rounded-lg border border-layout bg-surface-2 p-1">
      <button
        type="button"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          value === "list"
            ? "bg-card text-accent shadow-sm"
            : "text-muted hover:text-base",
        )}
        onClick={() => onChange("list")}
        title="List view"
        aria-label="List view"
        aria-pressed={value === "list"}
      >
        <LayoutList className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          value === "gallery"
            ? "bg-card text-accent shadow-sm"
            : "text-muted hover:text-base",
        )}
        onClick={() => onChange("gallery")}
        title="Gallery view"
        aria-label="Gallery view"
        aria-pressed={value === "gallery"}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function GallerySortControl({
  onDirectionChange,
  onKeyChange,
  sort,
}: {
  onDirectionChange: (direction: SortState["direction"]) => void;
  onKeyChange: (key: SortKey) => void;
  sort: SortState;
}) {
  return (
    <div className="flex min-w-[260px] flex-[0_0_auto] gap-2">
      <label className="flex-1 block min-w-0">
        <span className="sr-only">Gallery sort field</span>
        <select
          className={selectControlClassName}
          value={sort.key}
          onChange={(event) => onKeyChange(event.target.value as SortKey)}
        >
          {gallerySortOptions.map((option) => (
            <option key={option.key} value={option.key}>
              Sort: {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 p-1 rounded-lg h-11 w-28 shrink-0 bg-surface-2">
        {(["asc", "desc"] as const).map((direction) => (
          <button
            key={direction}
            type="button"
            className={`rounded-md px-2 text-xs font-semibold transition ${
              sort.direction === direction
                ? "bg-card text-accent shadow-sm"
                : "text-muted hover:text-base"
            }`}
            onClick={() => onDirectionChange(direction)}
          >
            {direction === "asc" ? "Asc" : "Desc"}
          </button>
        ))}
      </div>
    </div>
  );
}

function GalleryView({
  allItems,
  items,
  layout,
  onEdit,
  thumbnailByItemId,
}: {
  allItems: Item[];
  items: Item[];
  layout: { cardSize: number; columns: number; width: number };
  onEdit: (item: Item) => void;
  thumbnailByItemId: Map<string, ItemImageThumbnail>;
}) {
  return (
    <div
      className="mt-6 grid justify-start gap-3"
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardSize}px)`,
        width: layout.width,
      }}
    >
      {items.map((item, index) => (
        <GalleryCard
          key={item.tsid}
          allItems={allItems}
          cardSize={layout.cardSize}
          item={item}
          index={index}
          onEdit={() => onEdit(item)}
          thumbnail={thumbnailByItemId.get(item.tsid)}
        />
      ))}
    </div>
  );
}

function GalleryCard({
  allItems,
  cardSize,
  item,
  index,
  onEdit,
  thumbnail,
}: {
  allItems: Item[];
  cardSize: number;
  item: Item;
  index: number;
  onEdit: () => void;
  thumbnail: ItemImageThumbnail | undefined;
}) {
  const effectiveStatus = getEffectiveItemStatus(item, allItems);
  const price =
    effectiveStatus === "sold"
      ? calculateItemSellValue(item, allItems)
      : item.buy_price;

  return (
    <button
      type="button"
      style={{
        animationDelay: `${Math.min(index * 40, 400)}ms`,
        width: cardSize,
      }}
      className="group relative aspect-square overflow-hidden rounded-lg bg-surface-2/70 text-left opacity-0 shadow-sm transition hover:shadow-md animate-fadeIn"
      onClick={onEdit}
    >
      <ImageWithSkeleton
        src={thumbnail?.signed_url}
        alt={item.name}
        skeletonClassName="aspect-square w-full"
        className="transition-transform duration-500 ease-out group-hover:scale-105"
      />
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.20) 20%, rgba(0,0,0,0) 45%)",
        }}
      />
      {item.is_bundle_parent ? (
        <div className="absolute left-2 top-2">
          <span className="inline-flex h-6 items-center gap-1 rounded-full border border-white/20 bg-black/40 px-2 text-[10px] font-semibold text-white backdrop-blur-sm">
            <Link2 className="h-3 w-3" aria-hidden="true" />
            Bundle
          </span>
        </div>
      ) : item.bundle_id ? (
        <div className="absolute left-2 top-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-sm">
            <Link2 className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>
      ) : null}
      <div className="absolute right-2 top-2">
        <span
          className={`inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold ${getStatusBadgeClassName(
            effectiveStatus,
          )}`}
        >
          {getStatusLabel(effectiveStatus)}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="text-sm font-semibold leading-tight text-white line-clamp-2 drop-shadow-sm">
          {item.name}
        </p>
        <p className="mt-0.5 text-xs font-medium text-white/80">
          {formatCurrency(price)}
        </p>
      </div>
    </button>
  );
}

function ItemThumbnail({
  name,
  thumbnail,
}: {
  name: string;
  thumbnail: ItemImageThumbnail | undefined;
}) {
  return (
    <ImageWithSkeleton
      src={thumbnail?.signed_url}
      alt={name}
      skeletonClassName="h-10 w-10 shrink-0 rounded-md flex-shrink-0"
      className="rounded-md"
    />
  );
}

function BundleBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent bg-accent/15 ">
      Bundle ({count})
    </span>
  );
}

function MobileMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: number | null;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-muted ">{label}</p>
      <p
        className={
          tone === undefined ? "font-medium" : metricTextClassName(tone)
        }
      >
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  className = "min-w-[150px] flex-[0_1_180px]",
  label,
  onChange,
  options,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        className={selectControlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function getStatusBadgeClassName(status: ItemStatus) {
  return {
    holding:
      "border border-blue-500/40 bg-blue-500/80 text-white dark:border-blue-400/40 dark:bg-blue-400/80 dark:text-slate-950",
    listed:
      "border border-amber-500/40 bg-amber-500/80 text-slate-950 dark:border-amber-400/40 dark:bg-amber-400/80",
    sold:
      "border border-positive/40 bg-positive/80 text-accent-fg",
    keeper:
      "border border-purple-500/40 bg-purple-500/80 text-white dark:border-purple-400/40 dark:bg-purple-400/80 dark:text-slate-950",
  }[status];
}

function SortIcon({
  active,
  direction,
}: {
  active: boolean;
  direction: SortState["direction"];
}) {
  if (!active) {
    return <ArrowUp className="h-3.5 w-3.5 opacity-20" aria-hidden="true" />;
  }

  return direction === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
  );
}

function LoadingState() {
  return (
    <div className="mt-6 overflow-hidden rounded-lg shadow-sm bg-card">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="grid gap-4 p-4 border-b border-subtle last:border-0 md:grid-cols-6"
        >
          {Array.from({ length: 6 }).map((__, cellIndex) => (
            <div
              key={cellIndex}
              className="h-4 rounded animate-pulse bg-surface-2"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="p-10 mt-6 text-center rounded-lg shadow-sm bg-card">
      <div className="grid w-20 h-20 mx-auto rounded-full place-items-center bg-accent-soft text-accent bg-accent/15 ">
        <PackageOpen className="w-10 h-10" aria-hidden="true" />
      </div>
      <h3 className="mt-5 text-xl font-semibold">Add your first flip</h3>
      <p className="max-w-md mx-auto mt-2 text-sm text-muted ">
        Start tracking purchase costs, listing status, sale price, and profit in
        one place.
      </p>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-2 px-4 py-3 mt-6 text-sm font-semibold transition rounded-lg shadow-lg bg-accent text-accent-fg shadow-accent/20 hover:bg-accent/90"
        onClick={onAdd}
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        Add your first flip
      </button>
    </div>
  );
}

function NoResults() {
  return (
    <div className="p-6 mt-6 text-sm text-center rounded-lg bg-card text-muted">
      No items match the current filters.
    </div>
  );
}

function metricCellClassName(value: number | null) {
  return `px-4 py-4 font-semibold ${metricTextClassName(value)}`;
}

function metricTextClassName(value: number | null) {
  if (value === null || value === 0) {
    return "font-semibold text-muted ";
  }

  return value > 0
    ? "font-semibold text-positive "
    : "font-semibold text-negative ";
}

function getQueryStatus(value: string | null) {
  return allStatuses.find((status) => status === value && status !== "all");
}

function getQueryBundleFilter(value: string | null): BundleFilter {
  if (value === "active") {
    return "active";
  }

  if (value === "only") {
    return "only";
  }

  return "none";
}

function getInitialViewMode(): ViewMode {
  if (typeof localStorage === "undefined") {
    return "list";
  }

  return localStorage.getItem("flipsite-items-view") === "gallery"
    ? "gallery"
    : "list";
}

function getGalleryCardSize() {
  if (window.innerWidth >= 1280) {
    return 240;
  }

  if (window.innerWidth >= 768) {
    return 220;
  }

  return 200;
}

function downloadCsv(
  rows: Array<Record<string, string | number>>,
  fileName: string,
) {
  if (rows.length === 0) {
    return;
  }

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => csvEscape(row[header])).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function csvEscape(value: string | number) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

const controlClassName =
  "h-11 w-full min-w-0 rounded-lg border border-border-base bg-card px-3 text-sm text-base outline-none transition placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/10 ";
const selectControlClassName = controlClassName + " pr-10";
