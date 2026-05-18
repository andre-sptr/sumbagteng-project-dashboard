import { describe, expect, it } from 'vitest';
import { normalizeBoqItems } from '../src/lib/boq-items';

describe('normalizeBoqItems', () => {
  it('keeps parsed BoQ item objects readable for preview and persistence', () => {
    const rows = normalizeBoqItems([
      {
        no: 1,
        is_section: false,
        designator: 'OS-SM-1',
        uraian_pekerjaan: 'Penyambungan Kabel Optik',
        satuan: 'Core',
        harga_satuan_material: 0,
        harga_satuan_jasa: 49440,
        volume: 27,
        total_material: 0,
        total_jasa: 1334880,
        total: 1334880,
        keterangan: '',
      },
    ]);

    expect(rows).toEqual([
      {
        no: 1,
        is_section: false,
        designator: 'OS-SM-1',
        uraian_pekerjaan: 'Penyambungan Kabel Optik',
        satuan: 'Core',
        harga_satuan_material: 0,
        harga_satuan_jasa: 49440,
        volume: 27,
        total_material: 0,
        total_jasa: 1334880,
        total: 1334880,
        keterangan: '',
      },
    ]);
  });

  it('converts legacy full_data rows into normalized BoQ items', () => {
    const rows = normalizeBoqItems([
      {
        id_ihld: 'OS-SM-1',
        batch_program: '',
        full_data: JSON.stringify([
          1,
          'OS-SM-1',
          'Penyambungan Kabel Optik',
          'Core',
          0,
          49440,
          27,
          0,
          1334880,
          1334880,
          '',
        ]),
      },
    ]);

    expect(rows[0]).toMatchObject({
      no: 1,
      designator: 'OS-SM-1',
      uraian_pekerjaan: 'Penyambungan Kabel Optik',
      satuan: 'Core',
      harga_satuan_jasa: 49440,
      volume: 27,
      total: 1334880,
    });
  });
});
