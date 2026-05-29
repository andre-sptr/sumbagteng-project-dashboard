// Trend chart showing project progress over time
import React from 'react';
import { Calendar } from 'lucide-react';
import {
  BarChart,
  Bar,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface TimelineEntry {
  name: string;
  count: number;
}

interface TimelineChartProps {
  goliveMonthList: TimelineEntry[];
  totalGolivePorts: number;
}

const formatNumber = (value: unknown) => {
  const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
  return numericValue.toLocaleString('id-ID');
};

export const TimelineChart = ({ goliveMonthList, totalGolivePorts }: TimelineChartProps) => {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <Calendar size={18} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Tanggal Golive per Bulan (by Port)
        </h3>
        <span className="ml-auto text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {totalGolivePorts.toLocaleString('id-ID')} total ports golive
        </span>
      </div>
      {goliveMonthList.some(m => m.count > 0) ? (
        <div className="w-full">
          <ResponsiveContainer width="100%" height={350} minWidth={1}>
            <BarChart data={goliveMonthList} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
              <YAxis
                fontSize={10}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString()}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
              />
              <Tooltip
                cursor={{ fill: 'transparent' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={formatNumber}
              />
              <Bar
                dataKey="count"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name="Ports Golive"
                barSize={40}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={formatNumber}
                  className="fill-gray-700 text-[11px] font-semibold dark:fill-gray-200"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          Belum ada data tanggal golive tahun ini.
        </p>
      )}
    </div>
  );
};
