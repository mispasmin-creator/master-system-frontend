import { TableRow, TableCell } from "@/components/ui/table";

export function EmptyRow({ colSpan, label }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-32 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {label}
      </TableCell>
    </TableRow>
  );
}


export function LoadingRows({ colSpan, rows = 3 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell colSpan={colSpan}>
            <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full animate-pulse" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
