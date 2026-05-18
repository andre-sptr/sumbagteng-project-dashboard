import { normalizeBoqItems } from '@/lib/boq-items';

interface BoqPreviewTableProps {
  rows: unknown[];
}

function formatNumber(value: number) {
  if (!Number.isFinite(value) || value === 0) return '-';
  return value.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export default function BoqPreviewTable({ rows }: BoqPreviewTableProps) {
  const items = normalizeBoqItems(rows);

  if (items.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Tidak ada baris BoQ yang bisa ditampilkan.
      </div>
    );
  }

  return (
    <table className="w-full text-left border-collapse min-w-[1200px]">
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-900/50">
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">No</th>
          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Designator</th>
          <th className="px-3 py-2 text-left text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Uraian Pekerjaan</th>
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Satuan</th>
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Harga Material</th>
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Harga Jasa</th>
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Vol</th>
          <th className="px-3 py-2 text-center text-[10px] font-black text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">Total</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((row, idx) => {
          if (row.is_section) {
            return (
              <tr key={`${row.designator}-${idx}`} className="bg-red-50 dark:bg-red-900/20">
                <td className="px-3 py-2 text-xs font-bold text-red-700 dark:text-red-300">-</td>
                <td colSpan={7} className="px-3 py-2 text-xs font-black text-red-700 dark:text-red-300 uppercase">
                  {row.designator}
                </td>
              </tr>
            );
          }

          return (
            <tr key={`${row.designator}-${idx}`} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-colors">
              <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400 tabular-nums">{row.no || '-'}</td>
              <td className="px-3 py-2 text-xs text-left font-bold text-gray-900 dark:text-white">{row.designator}</td>
              <td className="px-3 py-2 text-xs text-left text-gray-600 dark:text-gray-400 max-w-md whitespace-normal">{row.uraian_pekerjaan || '-'}</td>
              <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400">{row.satuan || '-'}</td>
              <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400 tabular-nums">{formatNumber(row.harga_satuan_material)}</td>
              <td className="px-3 py-2 text-xs text-center text-gray-600 dark:text-gray-400 tabular-nums">{formatNumber(row.harga_satuan_jasa)}</td>
              <td className="px-3 py-2 text-xs text-center font-semibold text-gray-900 dark:text-white tabular-nums">{formatNumber(row.volume)}</td>
              <td className="px-3 py-2 text-xs text-center font-bold text-gray-900 dark:text-white tabular-nums">{formatNumber(row.total)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
