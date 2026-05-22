// Detail page for Selisih AANWIJZING (currently empty placeholder)
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function SelisihAanwijzingPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft size={16} />
        Kembali
      </button>

      <div>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">
          Selisih AANWIJZING
        </h1>
      </div>
    </div>
  );
}
