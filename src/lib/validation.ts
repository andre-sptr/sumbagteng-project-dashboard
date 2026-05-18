import { z } from 'zod';

// Common ID validation (alphanumeric with hyphens)
export const idSchema = z
  .string()
  .min(1, 'ID tidak boleh kosong')
  .regex(/^[A-Z0-9-]+$/, 'ID harus berupa huruf kapital, angka, dan tanda hubung');

// Common name validation
export const nameSchema = z
  .string()
  .min(1, 'Nama tidak boleh kosong')
  .max(255, 'Nama terlalu panjang (maksimal 255 karakter)');

// Date string validation (YYYY-MM-DD)
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Tanggal tidak valid');

// Optional text field
export const optionalTextSchema = z.string().optional().default('');

// Optional integer field
export const optionalIntSchema = z.coerce.number().int().optional().default(0);

// Schema for creating/updating aanwijzing
export const aanwijzingSchema = z.object({
  id: idSchema.optional(),
  nama_lop: nameSchema,
  id_ihld: z.string().min(1, 'ID IHLD tidak boleh kosong'),
  tematik: optionalTextSchema,
  area: optionalTextSchema,
  sto: optionalTextSchema,
  tanggal_aanwijzing: dateSchema,
  catatan: optionalTextSchema,
  status_after_aanwijzing: optionalTextSchema,
  gpon: optionalTextSchema,
  odc_name: optionalTextSchema,
  frame: optionalIntSchema,
  slot_awal: optionalIntSchema,
  slot_akhir: optionalIntSchema,
  port_awal: optionalIntSchema,
  port_akhir: optionalIntSchema,
  wa_spang: optionalTextSchema,
  ut: optionalTextSchema,
  allow_overwrite: z.boolean().optional().default(false),
});

export type AanwijzingInput = z.infer<typeof aanwijzingSchema>;

// Schema for aanwijzing query parameters
export const aanwijzingQuerySchema = z.object({
  id: idSchema,
});

// Schema for BoQ Aanwijzing
export const boqAanwijzingSchema = z.object({
  aanwijzing_id: idSchema,
  nama_lop: nameSchema,
  id_ihld: z.string().min(1, 'ID IHLD tidak boleh kosong'),
  boq_items: z.array(z.unknown()).optional().default([]),
});

export type BoqAanwijzingInput = z.infer<typeof boqAanwijzingSchema>;

// Schema for creating/updating UT
export const utSchema = z.object({
  id: idSchema.optional(),
  nama_lop: nameSchema,
  id_ihld: z.string().min(1, 'ID IHLD tidak boleh kosong'),
  witel: optionalTextSchema,
  tematik: optionalTextSchema,
  sto: optionalTextSchema,
  tim_ut: optionalTextSchema,
  commtest_ut: optionalTextSchema,
  jumlah_odp: optionalIntSchema,
  jumlah_port: optionalIntSchema,
  tanggal_ct_ut: z.string().optional().default(''),
  temuan: optionalTextSchema,
  mitra: optionalTextSchema,
  jumlah_temuan: optionalIntSchema,
  wa_spang: optionalTextSchema,
  komitmen_penyelesaian: optionalTextSchema,
});

export type UtInput = z.infer<typeof utSchema>;

// Schema for UT query parameters
export const utQuerySchema = z.object({
  id: idSchema,
});

// Schema for BoQ UT
export const boqUtSchema = z.object({
  ut_id: idSchema,
  nama_lop: nameSchema,
  id_ihld: z.string().min(1, 'ID IHLD tidak boleh kosong'),
  boq_items: z.array(z.unknown()).optional().default([]),
});

export type BoqUtInput = z.infer<typeof boqUtSchema>;

// Schema for BoQ file upload
export const boqUploadSchema = z.object({
  nama_lop: nameSchema,
  id_ihld: z.string().min(1, 'ID IHLD tidak boleh kosong'),
});

export type BoqUploadInput = z.infer<typeof boqUploadSchema>;

// Schema for BoQ query parameters
export const boqQuerySchema = z.object({
  id: idSchema,
});

// Schema for file validation
export const fileSchema = z.object({
  name: z.string().min(1, 'Nama file tidak boleh kosong'),
  size: z.number().positive('Ukuran file harus lebih dari 0'),
  type: z.string().min(1, 'Tipe file tidak boleh kosong'),
});

// Validate Excel file extension
export function validateExcelFile(filename: string): boolean {
  return filename.endsWith('.xlsx') || filename.endsWith('.xls');
}

// Validate file size (max 10MB)
export function validateFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
}

// Schema for webhook request
export const webhookSchema = z.object({
});

// Parse and validate request body
export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

// Parse and validate query parameters
export function validateQuery<T>(schema: z.ZodSchema<T>, params: unknown): T {
  return schema.parse(params);
}

// Safe parse with error handling
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Format Zod validation errors for API response
export function formatValidationError(error: z.ZodError): string {
  const errors = error.issues.map((issue) => {
    const path = issue.path.join('.');
    return `${path}: ${issue.message}`;
  });
  return errors.join(', ');
}

// Format Zod validation errors as object
export function formatValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  });
  return errors;
}

// ============================================================================
// OLT Inventory Validation Schemas
// ============================================================================

export const oltSchema = z.object({
  id: z.string().uuid('ID harus berupa UUID yang valid').optional(),
  ip_address: z.string().regex(
    /^(\d{1,3}\.){3}\d{1,3}$/,
    'IP address harus berupa IPv4 yang valid'
  ).refine((ip) => {
    const parts = ip.split('.');
    return parts.every(part => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }, 'IP address tidak valid (setiap oktet harus 0-255)'),
  hostname: nameSchema,
  brand: optionalTextSchema,
  model: optionalTextSchema,
  software_version: optionalTextSchema,
  serial_number: z.string().optional().nullable(),
  location_name: optionalTextSchema,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  area: optionalTextSchema,
  branch: optionalTextSchema,
  sto: optionalTextSchema,
  uplink_config: z.string().optional().default('{}'),
  dualhoming_enabled: z.number().int().min(0).max(1).optional().default(0),
  dualhoming_pair: z.string().optional().nullable(),
  total_ports: z.number().int().min(0).optional().default(0),
  used_ports: z.number().int().min(0).optional().default(0),
  available_ports: z.number().int().min(0).optional().default(0),
  cacti_integrated: z.number().int().min(0).max(1).optional().default(0),
  cacti_device_id: z.string().optional().nullable(),
  nms_integrated: z.number().int().min(0).max(1).optional().default(0),
  nms_device_id: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional().default('active'),
  installation_date: z.string().optional().nullable(),
  last_maintenance_date: z.string().optional().nullable(),
  next_maintenance_date: z.string().optional().nullable(),
  notes: optionalTextSchema,
});

export type OltInput = z.infer<typeof oltSchema>;

// Schema for OLT update (all fields optional except id)
export const oltUpdateSchema = oltSchema.partial().required({ id: true });

export type OltUpdateInput = z.infer<typeof oltUpdateSchema>;

// Schema for OLT query/filter parameters
export const oltQuerySchema = z.object({
  area: z.string().optional(),
  branch: z.string().optional(),
  sto: z.string().optional(),
  status: z.enum(['active', 'inactive', 'maintenance']).optional(),
  search: z.string().optional(),
});

export type OltQueryInput = z.infer<typeof oltQuerySchema>;

// ============================================================================
// ODC Inventory Validation Schemas
// ============================================================================

export const odcSchema = z.object({
  id: z.string().uuid('ID harus berupa UUID yang valid').optional(),
  odc_name: nameSchema,
  regional: optionalTextSchema,
  witel: optionalTextSchema,
  datel: optionalTextSchema,
  sto: z.string().min(1, 'STO tidak boleh kosong'),
  olt_id: z.string().uuid('OLT ID harus berupa UUID yang valid').optional().nullable(),
  splitter_type: z.enum(['48', '144', '288', '']).optional().default(''),
  max_capacity: z.number().int().min(0).optional().default(0),
  used_capacity: z.number().int().min(0).optional().default(0),
  available_capacity: z.number().int().min(0).optional().default(0),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  polygon_coordinates: z.string().optional().default('[]'),
  polygon_status: z.enum(['planned', 'active', 'inactive']).optional().default('planned'),
  installation_date: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  notes: optionalTextSchema,
});

export type OdcInput = z.infer<typeof odcSchema>;

// Schema for ODC update (all fields optional except id)
export const odcUpdateSchema = odcSchema.partial().required({ id: true });

export type OdcUpdateInput = z.infer<typeof odcUpdateSchema>;

// Schema for ODC query/filter parameters
export const odcQuerySchema = z.object({
  regional: z.string().optional(),
  witel: z.string().optional(),
  datel: z.string().optional(),
  sto: z.string().optional(),
  olt_id: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  polygon_status: z.enum(['planned', 'active', 'inactive']).optional(),
  search: z.string().optional(),
});

export type OdcQueryInput = z.infer<typeof odcQuerySchema>;

// ============================================================================
// Vendor Management Validation Schemas
// ============================================================================

export const vendorSchema = z.object({
  id: z.string().uuid('ID harus berupa UUID yang valid').optional(),
  vendor_name: nameSchema,
  vendor_code: z.string().optional().nullable(),
  contact_person: optionalTextSchema,
  phone: z.string().optional().default(''),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')).default(''),
  address: optionalTextSchema,
  contract_start_date: z.string().optional().nullable(),
  contract_end_date: z.string().optional().nullable(),
  contract_value: z.number().min(0, 'Nilai kontrak tidak boleh negatif').optional().default(0),
  rating: z.number().min(0).max(5, 'Rating harus antara 0-5').optional().default(0),
  total_projects: z.number().int().min(0).optional().default(0),
  completed_projects: z.number().int().min(0).optional().default(0),
  on_time_delivery_rate: z.number().min(0).max(100, 'Persentase harus antara 0-100').optional().default(0),
  quality_score: z.number().min(0).max(100, 'Skor kualitas harus antara 0-100').optional().default(0),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  notes: optionalTextSchema,
});

export type VendorInput = z.infer<typeof vendorSchema>;

// Schema for Vendor update (all fields optional except id)
export const vendorUpdateSchema = vendorSchema.partial().required({ id: true });

export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;

// Schema for Vendor query/filter parameters
export const vendorQuerySchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  min_rating: z.number().min(0).max(5).optional(),
});

export type VendorQueryInput = z.infer<typeof vendorQuerySchema>;

// ============================================================================
// Validation Helper Functions for New Schemas
// ============================================================================

/**
 * Validate IP address format
 */
export function validateIpAddress(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validate coordinates (latitude, longitude)
 */
export function validateCoordinates(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate port number range
 */
export function validatePortRange(start: number, end: number, total: number): boolean {
  return start >= 0 && end >= start && end <= total;
}

/**
 * Validate capacity values
 */
export function validateCapacity(used: number, max: number): boolean {
  return used >= 0 && used <= max;
}

// ============================================================================
// Form Schemas for React Hook Form
// ============================================================================

/**
 * OLT Form Schema - Simplified for form input
 */
export const oltFormSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required').max(100, 'Hostname too long'),
  ip_address: z.string()
    .min(1, 'IP address is required')
    .regex(/^(\d{1,3}\.){3}\d{1,3}$/, 'Invalid IP address format')
    .refine((ip) => {
      const parts = ip.split('.');
      return parts.every(part => {
        const num = parseInt(part, 10);
        return num >= 0 && num <= 255;
      });
    }, 'Invalid IP address (each octet must be 0-255)'),
  brand: z.string(),
  model: z.string(),
  software_version: z.string(),
  serial_number: z.string(),
  location_name: z.string(),
  latitude: z.string(),
  longitude: z.string(),
  area: z.string(),
  branch: z.string(),
  sto: z.string(),
  total_ports: z.number().int().positive('Must be positive').min(1, 'At least 1 port required'),
  status: z.enum(['active', 'inactive', 'maintenance']),
  installation_date: z.string(),
  notes: z.string(),
});

export type OltFormData = z.infer<typeof oltFormSchema>;

/**
 * ODC Form Schema - Simplified for form input
 */
export const odcFormSchema = z.object({
  odc_name: z.string().min(1, 'ODC name is required').max(100, 'ODC name too long'),
  regional: z.string(),
  witel: z.string(),
  datel: z.string(),
  sto: z.string().min(1, 'STO is required'),
  olt_id: z.string(),
  splitter_type: z.string(),
  max_capacity: z.number().int().min(0, 'Capacity must be positive'),
  latitude: z.string(),
  longitude: z.string(),
  polygon_status: z.enum(['planned', 'surveyed', 'approved', 'deployed']),
  installation_date: z.string(),
  status: z.enum(['active', 'inactive', 'maintenance']),
  notes: z.string(),
});

export type OdcFormData = z.infer<typeof odcFormSchema>;

/**
 * Vendor Form Schema - Simplified for form input
 */
export const vendorFormSchema = z.object({
  vendor_name: z.string().min(1, 'Vendor name is required').max(255, 'Vendor name too long'),
  vendor_code: z.string(),
  contact_person: z.string(),
  phone: z.string(),
  email: z.string().email('Invalid email format').or(z.literal('')),
  address: z.string(),
  contract_start_date: z.string(),
  contract_end_date: z.string(),
  contract_value: z.number().min(0, 'Contract value cannot be negative'),
  rating: z.number().min(0).max(5, 'Rating must be between 0-5'),
  status: z.enum(['active', 'inactive']),
  notes: z.string(),
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;

