import {
  Download,
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
import { ItemDrawer } from "@/components/items/ItemDrawer";
import { useDeleteItem, useItems } from "@/hooks/useItems";
import {
  getFirstItemImageThumbnails,
  type ItemImageThumbnail,
} from "@/lib/itemFiles";
import { cn, getBuyPlatform, getStatusLabel } from "@/lib/utils";
import {
  getActiveBundleIds,
  getVisibleItems,
  getVisibleRows,
  uniqueItemValues,
  type BundleFilter,
  type SortKey,
  type SortState,
} from "@/components/items/itemListModel";
import { downloadItemCsv } from "@/components/items/itemCsvExport";
import { ItemTable } from "@/components/items/ItemTable";
import { ItemGallery } from "@/components/items/ItemGallery";
import { Tooltip } from "@/components/ui/Tooltip";
import { createItemIndex } from "@/domain/items/itemIndex";
import type { Item } from "@/types";

type DrawerState =
  | { open: false; mode: "add"; item: null }
  | { open: true; mode: "add"; item: null }
  | { open: true; mode: "edit"; item: Item };

type ViewMode = "list" | "gallery";

const allStatuses = ["all", "holding", "listed", "sold", "keeper"] as const;
const galleryThumbnailSize = 420;
const galleryGap = 12;
const listThumbnailSize = 80;
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
const browseSortOptions: Array<{
  direction: SortState["direction"];
  key: SortKey;
  label: string;
  value: string;
}> = [
  { key: "bought_at", direction: "desc", label: "Newest first", value: "bought_at:desc" },
  { key: "bought_at", direction: "asc", label: "Oldest first", value: "bought_at:asc" },
  { key: "profit", direction: "desc", label: "Highest profit", value: "profit:desc" },
  { key: "profit", direction: "asc", label: "Lowest profit", value: "profit:asc" },
  { key: "roi", direction: "desc", label: "Highest ROI", value: "roi:desc" },
  { key: "roi", direction: "asc", label: "Lowest ROI", value: "roi:asc" },
  { key: "sold_at", direction: "desc", label: "Recently sold", value: "sold_at:desc" },
  { key: "bought_at", direction: "asc", label: "Oldest inventory", value: "oldest_inventory" },
  { key: "created_at", direction: "desc", label: "Recently added", value: "created_at:desc" },
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
  const [browseSortValue, setBrowseSortValue] = useState("bought_at:desc");
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
  const itemIndex = useMemo(() => createItemIndex(items), [items]);
  const childrenByBundle = itemIndex.childrenByBundleId;
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
  const coverImageByItemId = useMemo(
    () =>
      new Map(
        items.map((item) => [item.tsid, item.cover_image_id] as const),
      ),
    [items],
  );
  const coverImageIds = useMemo(
    () => thumbnailItemIds.map((itemId) => coverImageByItemId.get(itemId) ?? null),
    [coverImageByItemId, thumbnailItemIds],
  );
  const thumbnailSize =
    viewMode === "gallery" ? galleryThumbnailSize : listThumbnailSize;
  const { data: thumbnailByItemId = new Map<string, ItemImageThumbnail>() } =
    useQuery({
      queryKey: ["item-image-thumbnails", thumbnailSize, thumbnailItemIds, coverImageIds],
      enabled: thumbnailItemIds.length > 0,
      staleTime: 1000 * 60 * 30,
      queryFn: async () => {
        const thumbnails = await getFirstItemImageThumbnails(thumbnailItemIds, {
          coverImageByItemId,
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
    setSort((currentSort) => {
      const nextSort: SortState = {
        key,
        direction:
        currentSort.key === key && currentSort.direction === "asc"
          ? "desc"
          : "asc",
      };
      setBrowseSortValue(getBrowseSortValue(nextSort));

      return nextSort;
    });
  }

  function updateViewMode(nextViewMode: ViewMode) {
    if (nextViewMode !== "gallery") {
      setHasImage(false);
    }

    setViewMode(nextViewMode);
  }

  function updateBrowseSort(value: string) {
    const option = browseSortOptions.find((sortOption) => sortOption.value === value);

    if (!option) {
      return;
    }

    setSort({ key: option.key, direction: option.direction });
    setBrowseSortValue(value);
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
    downloadItemCsv(displayedItems, items);
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

        <div className="max-w-full rounded-xl bg-card px-3 py-2 shadow-sm">
          <div className="flex min-w-0 flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
            <label className="relative block min-w-0 xl:w-[320px] xl:flex-none 2xl:w-[360px]">
                <Search
                  className="absolute w-4 h-4 -translate-y-1/2 pointer-events-none left-3 top-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  className={searchControlClassName}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by item, category, source, notes..."
                />
              </label>

            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap xl:flex-1">
                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(value as (typeof allStatuses)[number])
                  }
                  options={allStatuses.map((status) => ({
                    value: status,
                    label: status === "all" ? "Any status" : getStatusLabel(status),
                  }))}
                  className="sm:w-36"
                />
                <FilterSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  options={[
                    { value: "all", label: "Any category" },
                    ...categories.map((category) => ({
                      value: category,
                      label: category,
                    })),
                  ]}
                  className="sm:w-40"
                />
                <FilterSelect
                  label="Source"
                  value={buyPlatformFilter}
                  onChange={setBuyPlatformFilter}
                  options={[
                    { value: "all", label: "Any source" },
                    ...buyPlatforms.map((platform) => ({
                      value: platform,
                      label: platform,
                    })),
                  ]}
                  className="sm:w-40"
                />
                <BrowseSortControl
                  value={browseSortValue}
                  onChange={updateBrowseSort}
                />
              </div>

            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <ToggleChip
                active={inventoryOnly}
                label="Inventory"
                onToggle={() => setInventoryOnly((current) => !current)}
              />
              <ToggleChip
                active={bundleFilter !== "none"}
                label="Bundles"
                onToggle={() =>
                  setBundleFilter((current) => (current === "none" ? "only" : "none"))
                }
              />
              {viewMode === "gallery" ? (
                <ToggleChip
                  active={hasImage}
                  label="Image"
                  onToggle={() => setHasImage((current) => !current)}
                />
              ) : null}
              <ViewToggle value={viewMode} onChange={updateViewMode} />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : emptyAllItems ? (
        <EmptyState onAdd={openAddDrawer} />
      ) : (
        <>
          {viewMode === "gallery" ? (
            <ItemGallery
              allItems={items}
              items={displayedItems}
              layout={galleryLayout}
              onEdit={openEditDrawer}
              thumbnailByItemId={thumbnailByItemId}
            />
          ) : (
            <ItemTable
              allItems={items}
              childrenByBundle={childrenByBundle}
              columns={tableColumns}
              expandedBundles={expandedBundles}
              onDelete={setDeleteTarget}
              onEdit={openEditDrawer}
              onToggleBundle={toggleBundle}
              onUpdateSort={updateSort}
              rows={visibleRows}
              sort={sort}
              thumbnailByItemId={thumbnailByItemId}
            />
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

function ViewToggle({
  onChange,
  value,
}: {
  onChange: (value: ViewMode) => void;
  value: ViewMode;
}) {
  return (
    <div className="flex flex-[0_0_auto] items-center gap-0.5 rounded-lg border border-layout bg-surface-2 p-1">
      <Tooltip content="List view" side="top">
      <button
        type="button"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          value === "list"
            ? "bg-card text-accent shadow-sm"
            : "text-muted hover:text-base",
        )}
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={value === "list"}
      >
        <LayoutList className="w-4 h-4" aria-hidden="true" />
      </button>
      </Tooltip>
      <Tooltip content="Gallery view" side="top">
      <button
        type="button"
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          value === "gallery"
            ? "bg-card text-accent shadow-sm"
            : "text-muted hover:text-base",
        )}
        onClick={() => onChange("gallery")}
        aria-label="Gallery view"
        aria-pressed={value === "gallery"}
      >
        <LayoutGrid className="w-4 h-4" aria-hidden="true" />
      </button>
      </Tooltip>
    </div>
  );
}

function BrowseSortControl({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block sm:w-40">
      <span className="sr-only">Sort items</span>
      <select
        className={selectControlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {browseSortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FilterSelect({
  className = "min-w-[150px] flex-[0_1_180px]",
  label,
  onChange,
  options,
  variant = "default",
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  variant?: "default" | "soft";
  value: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        className={
          variant === "soft" ? softSelectControlClassName : selectControlClassName
        }
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

function ToggleChip({
  active,
  label,
  onToggle,
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-full border px-2.5 text-sm font-medium transition focus:outline-none focus:ring-4 focus:ring-accent/15",
        active
          ? "border-accent/35 bg-accent/10 text-accent"
          : "border-border-base bg-card text-muted hover:border-accent/30 hover:bg-accent/5 hover:text-accent",
      )}
      onClick={onToggle}
      aria-pressed={active}
    >
      {label}
    </button>
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

function getBrowseSortValue(sort: SortState) {
  const matchingOption = browseSortOptions.find(
    (option) => option.key === sort.key && option.direction === sort.direction,
  );

  return matchingOption?.value ?? "bought_at:desc";
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

const controlClassName =
  "h-9 w-full min-w-0 rounded-lg border border-border-base bg-card px-2.5 text-sm text-base outline-none transition placeholder:text-muted hover:border-accent/30 focus:border-accent focus:ring-4 focus:ring-accent/10 ";
const selectControlClassName = controlClassName + " pr-10";
const searchControlClassName =
  "h-9 w-full min-w-0 rounded-lg border border-border-base bg-card px-3 pl-9 text-sm text-base outline-none transition placeholder:text-muted hover:border-accent/35 focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/10";
const softSelectControlClassName =
  "h-9 w-full min-w-0 rounded-full border border-transparent bg-surface-2 px-3 pr-9 text-sm font-semibold text-muted outline-none transition hover:bg-accent/10 hover:text-accent focus:border-accent focus:bg-card focus:ring-4 focus:ring-accent/10";
