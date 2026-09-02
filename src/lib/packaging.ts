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

export interface ArticleItemLike {
  cantidad: number;
  nombre: string;
  variante?: string;
}

export interface ArticleFormatDetails {
  cantidad: number;
  presentacion: string;
  unidadesTotal: number;
  nombre: string;
  varianteExtra?: string;
  fullText: string;
}

/**
 * Standardizes the article presentation format across all system documents:
 * FORMAT: [Cantidad] [presentación] ([cantidad de unidades] u.) de [Nombre del producto]
 * Examples:
 *  - 1 docena (12 u.) de Resaltador borrable
 *  - 2 docenas (24 u.) de Resaltador borrable
 *  - 1 box de 24 (24 u.) de Lapicero
 *  - 2 boxes de 24 (48 u.) de Lapicero
 */
export function formatArticleItem(item: ArticleItemLike): string {
  return parseArticleFormat(item).fullText;
}

export function parseArticleFormat(item: ArticleItemLike): ArticleFormatDetails {
  const qty = Number(item.cantidad) || 1;
  const nombre = (item.nombre || 'Artículo').trim();
  const rawVariant = (item.variante || '').trim();

  // If no variant specified or explicitly "unidad"
  if (!rawVariant) {
    const presentacion = qty === 1 ? 'unidad' : 'unidades';
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: qty,
      nombre,
      fullText: `${qty} ${presentacion} (${qty} u.) de ${nombre}`,
    };
  }

  const lowerVariant = rawVariant.toLowerCase();

  // 1. Docena / Media Docena
  if (lowerVariant.includes('media docena') || lowerVariant.includes('½ docena')) {
    const totalUnits = qty * 6;
    const presentacion = qty === 1 ? 'media docena' : 'medias docenas';
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: totalUnits,
      nombre,
      fullText: `${qty} ${presentacion} (${totalUnits} u.) de ${nombre}`,
    };
  }

  if (lowerVariant.includes('docena')) {
    const totalUnits = qty * 12;
    const presentacion = qty === 1 ? 'docena' : 'docenas';
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: totalUnits,
      nombre,
      fullText: `${qty} ${presentacion} (${totalUnits} u.) de ${nombre}`,
    };
  }

  // 2. Medio Box (e.g., "Medio Box de 24 (12 u.)", "Medio Box de 36 (18 u.)")
  const medioBoxMatch = lowerVariant.match(/medio\s+box\s+de\s+(\d+)/i) || lowerVariant.match(/½\s*box\s*(\d+)/i);
  if (medioBoxMatch) {
    const boxSize = parseInt(medioBoxMatch[1], 10);
    const explicitUnitMatch = lowerVariant.match(/\((\d+)\s*u\.?\)/i);
    const unitsPerMedioBox = explicitUnitMatch ? parseInt(explicitUnitMatch[1], 10) : Math.round(boxSize / 2);
    const totalUnits = qty * unitsPerMedioBox;
    const presentacion = qty === 1 ? `medio box de ${boxSize}` : `medios boxes de ${boxSize}`;
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: totalUnits,
      nombre,
      fullText: `${qty} ${presentacion} (${totalUnits} u.) de ${nombre}`,
    };
  }

  // 3. Box (e.g., "Box de 24 u.", "Box de 36 u.", "Box de 48 u.", "Box de 60 u.")
  const boxMatch = lowerVariant.match(/box\s+de\s+(\d+)/i) || lowerVariant.match(/box\s+(\d+)/i);
  if (boxMatch) {
    const boxSize = parseInt(boxMatch[1], 10);
    const totalUnits = qty * boxSize;
    const presentacion = qty === 1 ? `box de ${boxSize}` : `boxes de ${boxSize}`;
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: totalUnits,
      nombre,
      fullText: `${qty} ${presentacion} (${totalUnits} u.) de ${nombre}`,
    };
  }

  // 4. Unidad / Unidades
  if (lowerVariant === 'unidad' || lowerVariant === 'unidades' || lowerVariant === '1 u.' || lowerVariant === '1u') {
    const presentacion = qty === 1 ? 'unidad' : 'unidades';
    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: qty,
      nombre,
      fullText: `${qty} ${presentacion} (${qty} u.) de ${nombre}`,
    };
  }

  // 5. Generic packaging with explicit unit count: e.g. "Caja (50 u.)", "Paquete de 10 u.", "Tira de 6 u."
  const genericUnitsMatch =
    rawVariant.match(/^(.*?)\s*\(?(\d+)\s*(?:u\.?|unidades?)\)?$/i) ||
    rawVariant.match(/^(.*?)\s+de\s+(\d+)\s*(?:u\.?|unidades?)$/i);

  if (genericUnitsMatch) {
    let presBase = (genericUnitsMatch[1] || 'paquete').trim().toLowerCase();
    const unitsPerPack = parseInt(genericUnitsMatch[2], 10) || 1;
    const totalUnits = qty * unitsPerPack;

    // Pluralize Spanish noun
    let presentacion = presBase;
    if (qty > 1) {
      if (presBase.endsWith('s') || presBase.endsWith('x')) {
        presentacion = presBase;
      } else if (/[aeiouáéíóú]$/i.test(presBase)) {
        presentacion = presBase + 's';
      } else {
        presentacion = presBase + 'es';
      }
    }

    return {
      cantidad: qty,
      presentacion,
      unidadesTotal: totalUnits,
      nombre,
      fullText: `${qty} ${presentacion} (${totalUnits} u.) de ${nombre}`,
    };
  }

  // 6. Non-packaging variant (e.g., Color "Rosa", "Azul", "Modelo Stitch")
  const presentacion = qty === 1 ? 'unidad' : 'unidades';
  return {
    cantidad: qty,
    presentacion,
    unidadesTotal: qty,
    nombre,
    varianteExtra: rawVariant,
    fullText: `${qty} ${presentacion} (${qty} u.) de ${nombre} (${rawVariant})`,
  };
}
