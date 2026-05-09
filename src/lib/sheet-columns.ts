// Explicit mapping of Google Sheets column positions (0-based) to named constants.
// Spreadsheet headers are at row 2 (A2:AF2), data starts at row 4 (A4:AF).
// If Kantor Pusat inserts/removes a column, update ONLY this file.
export const COL = {
  TAHUN: 0,
  ID_IHLD: 1,
  NAMA_LOP: 2,
  REGIONAL: 3,
  AREA: 4,
  STO: 5,
  REGION_FMC: 6,
  BRANCH_FMC: 7,
  BATCH_PROGRAM: 8,
  ODP_PLAN: 9,
  PORT_PLAN: 10,
  CPP: 11,
  BOQ: 12,
  MITRA: 13,
  STATUS: 14,
  SUB_STATUS_KONS: 15,
  DETAIL_STATUS: 16,
  KET_BA_DROP: 17,
  KOMITMEN_GOLIVE: 18,
  TARGET_GOLIVE_APRIL: 19,
  PRIORITAS_1_TSEL: 20,
  PID_PROACTIVE: 21,
  WASPANG: 22,
  PROJECT_ADMIN: 23,
  STATUS_GOLIVE: 24,
  KENDALA_GOLIVE: 25,
  PROGRES_MINOL: 26,
  REAL_JML_ODP_8: 27,
  REAL_JML_ODP_16: 28,
  ID_SW_ABD: 29,
  REAL_JML_PORT_GOLIVE: 30,
  TANGGAL_GOLIVE: 31,
} as const;

export type ColKey = keyof typeof COL;
