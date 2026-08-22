import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Search, Filter, Plus } from 'lucide-react';
import { EmptyRow, LoadingRows } from './helpers';

// Tab strip (one pill per category) + a single "Add Master Entry" button + one
// table for whichever category tab is active. Replaces the old design of
// stacking every category as its own always-visible Card with its own Add
// button — that buried the real "Firms" data (name/short name/phone/email/
// GSTIN/PAN/PO prefix) under a generic single-column list alongside a dozen
// other categories competing for space.
//
// Most categories only ever collect one meaningful field (e.g. Transporter
// Name), so a single-column table is correct for them, not a shortcut — see
// each *_CATEGORIES entry's own comments for which ones (Purchase's "firm" and
// "raw_material") carry enough real fields to warrant a `columns` array.
export default function CategoryTabSection({
  categories,
  systemLabel,
  activeCategoryTab,
  setActiveCategoryTab,
  categorySearch,
  setCategorySearch,
  masterRows,
  tlRows,
  firms,
  masterDataLoading,
  firmsLoading,
  canAddEntry,
  openAddModal,
  openEditModal,
  setDeleteTarget,
}) {
  const activeCat = categories.find((c) => c.id === activeCategoryTab) || categories[0];
  const CategoryIcon = activeCat.icon;

  const sourceRows = activeCat.useToleranceRows ? tlRows : activeCat.useFirmsState ? firms : masterRows;
  const loading = activeCat.useFirmsState ? firmsLoading : masterDataLoading;

  const allItems = activeCat.useToleranceRows
    ? sourceRows.map((r) => ({ id: r.id, name: r.name || "—", raw: r }))
    : sourceRows.filter(activeCat.filter).map((r) => ({ id: r.id, name: activeCat.getName(r) || "—", raw: r }));

  const q = categorySearch.trim().toLowerCase();
  const items = q ? allItems.filter((it) => String(it.name).toLowerCase().includes(q)) : allItems;

  const columns = activeCat.columns || [
    { label: activeCat.columnHeader, get: (raw) => activeCat.getName(raw) || "—" },
  ];
  // Firms (purchase_firm) and Raw Materials & Tolerance (purchase_tolerance_limit)
  // are add-only from here — there's no PATCH/DELETE endpoint for either table,
  // and the generic /purchase/master/:id ones would target the wrong table
  // entirely since these rows' ids come from a different table's sequence.
  const supportsEditDelete = !activeCat.useFirmsState && !activeCat.useToleranceRows;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center flex-1 min-w-0">
          <div className="flex items-center gap-1.5 bg-zinc-100/90 dark:bg-card border border-zinc-200/80 dark:border-border rounded-2xl p-1.5 shadow-sm overflow-x-auto w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const TabIcon = cat.icon;
              const isActive = activeCat.id === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryTab(cat.id);
                    setCategorySearch("");
                  }}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 transition-all duration-200 shrink-0 ${
                    isActive
                      ? "bg-[#10b981] text-white font-semibold shadow-md shadow-emerald-500/25"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/70 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {TabIcon && (
                    <TabIcon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? "text-white" : "text-zinc-400 dark:text-zinc-500"
                      }`}
                    />
                  )}
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>
        {canAddEntry && (
          <Button
            onClick={() => openAddModal(activeCat.id)}
            className="h-10.5 px-5 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold flex items-center gap-2 shrink-0 shadow-md shadow-emerald-500/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Master Entry</span>
          </Button>
        )}
      </div>

      <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2.5">
              <CategoryIcon className="h-5 w-5 text-[#2fa36b]" />
              <span>{activeCat.title} Data Entry</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700/60">
                Total: {allItems.length}
              </span>
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{activeCat.description}</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder={`Search ${activeCat.title.toLowerCase()}…`}
                className="w-full sm:w-55 h-10.5 pl-10 pr-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium outline-none shadow-sm focus:ring-1 focus:ring-[#2fa36b] dark:focus:ring-[#5ec792] transition-all placeholder:text-zinc-400 text-zinc-900 dark:text-white"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10.5 rounded-full px-4 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex shrink-0"
            >
              <Filter className="w-4 h-4 mr-2 text-zinc-500" />
              Filters
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-900">
              <TableRow>
                {columns.map((col, idx) => (
                  <TableHead key={col.label} className={`whitespace-nowrap px-6 ${idx === 0 ? "font-semibold" : ""}`}>
                    {col.label}
                  </TableHead>
                ))}
                {supportsEditDelete && (
                  <TableHead className="w-[120px] text-right pr-6 whitespace-nowrap font-semibold">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <LoadingRows colSpan={columns.length + (supportsEditDelete ? 1 : 0)} />
              ) : items.length > 0 ? (
                items.map((row, idx) => (
                  <TableRow key={row.id ?? idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50">
                    {columns.map((col, ci) => (
                      <TableCell
                        key={col.label}
                        className={
                          ci === 0
                            ? "font-medium text-zinc-900 dark:text-white whitespace-nowrap px-6 py-3.5"
                            : "text-zinc-500 dark:text-zinc-400 whitespace-nowrap px-6 py-3.5"
                        }
                      >
                        {col.get(row.raw)}
                      </TableCell>
                    ))}
                    {supportsEditDelete && (
                      <TableCell className="text-right pr-6 py-3.5">
                        {canAddEntry && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                              onClick={() => openEditModal(activeCat.id, row)}
                              title="Edit entry"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setDeleteTarget(row)}
                              title="Delete entry"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <EmptyRow
                  colSpan={columns.length + (supportsEditDelete ? 1 : 0)}
                  label={`No ${activeCat.title.toLowerCase()} added yet for ${systemLabel}`}
                />
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

// "My Profile" tab
