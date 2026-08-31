export interface PackagingPreset {
  label: string;
  shortLabel: string;
  units: number;
  type: 'box' | 'half_box' | 'dozen' | 'half_dozen' | 'unit';
  category: '24' | '36' | '48' | '60' | 'dozen' | 'unit';
}

export const ALL_PACKAGING_PRESETS: PackagingPreset[] = [
  // Box de 24 y Medio Box de 24
  { label: 'Box de 24 u.', shortLabel: '📦 Box 24u', units: 24, type: 'box', category: '24' },
  { label: 'Medio Box de 24 (12 u.)', shortLabel: '📦 ½ Box 24 (12u)', units: 12, type: 'half_box', category: '24' },

  // Box de 36 y Medio Box de 36
  { label: 'Box de 36 u.', shortLabel: '📦 Box 36u', units: 36, type: 'box', category: '36' },
  { label: 'Medio Box de 36 (18 u.)', shortLabel: '📦 ½ Box 36 (18u)', units: 18, type: 'half_box', category: '36' },

  // Box de 48 y Medio Box de 48
  { label: 'Box de 48 u.', shortLabel: '📦 Box 48u', units: 48, type: 'box', category: '48' },
  { label: 'Medio Box de 48 (24 u.)', shortLabel: '📦 ½ Box 48 (24u)', units: 24, type: 'half_box', category: '48' },

  // Box de 60 y Medio Box de 60
  { label: 'Box de 60 u.', shortLabel: '📦 Box 60u', units: 60, type: 'box', category: '60' },
  { label: 'Medio Box de 60 (30 u.)', shortLabel: '📦 ½ Box 60 (30u)', units: 30, type: 'half_box', category: '60' },

  // Docenas
  { label: 'Docena (12 u.)', shortLabel: '🎁 Docena (12u)', units: 12, type: 'dozen', category: 'dozen' },
  { label: 'Media Docena (6 u.)', shortLabel: '🎁 ½ Docena (6u)', units: 6, type: 'half_dozen', category: 'dozen' },

  // Unidades
  { label: 'Unidad', shortLabel: '🏷️ Unidad (1u)', units: 1, type: 'unit', category: 'unit' },
];

export const PACKAGING_STRING_PRESETS = ALL_PACKAGING_PRESETS.map((p) => p.label);
