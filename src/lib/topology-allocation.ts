export interface AllocationInput {
  aanwijzing_id: string;
  nama_lop: string;
  id_ihld: string;
  area: string;
  sto: string;
  olt_name: string;
  odc_name: string;
  frame: number;
  slot_awal: number;
  slot_akhir: number;
  port_awal: number;
  port_akhir: number;
}

export interface AllocationRow extends AllocationInput {
  slot: number;
  port: number;
  port_str: string;
}

export function buildPortAllocations(input: AllocationInput): AllocationRow[] {
  const slotStart = Math.min(input.slot_awal, input.slot_akhir);
  const slotEnd = Math.max(input.slot_awal, input.slot_akhir);
  const portStart = Math.min(input.port_awal, input.port_akhir);
  const portEnd = Math.max(input.port_awal, input.port_akhir);
  const rows: AllocationRow[] = [];

  for (let slot = slotStart; slot <= slotEnd; slot += 1) {
    for (let port = portStart; port <= portEnd; port += 1) {
      rows.push({ ...input, slot, port, port_str: `${input.frame}/${slot}/${port}` });
    }
  }

  return rows;
}

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '');
}

export function detectOdcName(namaLop: string, odcNames: string[]): string {
  const normalizedName = compact(namaLop);
  return odcNames
    .filter(name => normalizedName.includes(compact(name)))
    .sort((a, b) => compact(b).length - compact(a).length)[0] ?? '';
}
