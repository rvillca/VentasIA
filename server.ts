import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Helper to format Bolivian phone numbers with +591
function formatBoliviaServerPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw.trim();

  if (digits.startsWith('591')) {
    const local = digits.slice(3);
    return `+591 ${local}`;
  }

  if (digits.length === 8) {
    return `+591 ${digits}`;
  }

  if (raw.trim().startsWith('+')) {
    return raw.trim();
  }

  return `+591 ${digits}`;
}

// Fallback heuristic extraction for products and prices in Bolivianos
function fallbackHeuristicParse(transcription: string) {
  const text = transcription.toLowerCase();
  const rawProducts: Array<{ nombre: string; variante: string; cantidad: number; precioUnitario: number }> = [];

  // Match segments separated by commas, " y ", " e ", newlines, or periods
  const segments = transcription.split(/(?:,|\sy\s|\se\s|\n|\.)+/i);

  for (const seg of segments) {
    const cleanSeg = seg.trim();
    if (!cleanSeg) continue;

    const qtyMatch = cleanSeg.match(/(\d+)\s*(?:unidades?|piezas?|mochilas?|libretas?|plumones?|cartucheras?|sets?)?/i);
    const cantidad = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;

    const priceMatch = cleanSeg.match(/(?:a|por|de|precio|c\/u|cada\s+una|en)?\s*(?:bs\.?|bolivianos)?\s*\$?(\d+(?:\.\d+)?)\s*(?:bs\.?|bolivianos|c\/u)?/i);
    const precio = priceMatch ? parseFloat(priceMatch[1]) || 0 : 0;

    let nombre = cleanSeg;
    nombre = nombre.replace(/(?:a|por|de|precio|c\/u|cada\s+una)\s*(?:bs\.?|bolivianos)?\s*\$?(\d+(?:\.\d+)?)/gi, '');
    nombre = nombre.replace(/^\d+\s*/, '');
    nombre = nombre.trim();

    if (nombre.length > 2) {
      const formattedName = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      // Check if already in list to avoid duplicates from speech repetitions
      const existing = rawProducts.find(
        (p) => p.nombre.toLowerCase() === formattedName.toLowerCase()
      );
      if (!existing) {
        rawProducts.push({
          nombre: formattedName,
          variante: '',
          cantidad,
          precioUnitario: precio,
        });
      }
    }
  }

  if (rawProducts.length === 0) {
    let defaultName = 'Mochila / Papelería';
    if (text.includes('kuromi')) defaultName = 'Mochila Temática Kuromi';
    else if (text.includes('stitch')) defaultName = 'Mochila Escolar Stitch';
    else if (text.includes('plumon') || text.includes('plumones')) defaultName = 'Set de Plumones';
    else if (text.includes('libreta') || text.includes('cuaderno')) defaultName = 'Libreta Kawaii';
    else if (text.includes('cartuchera') || text.includes('estuche')) defaultName = 'Cartuchera Triple';

    const priceMatch = text.match(/(?:bs\.?|bolivianos)?\s*\$?(\d+(?:\.\d+)?)/i);
    const precio = priceMatch ? parseFloat(priceMatch[1]) || 0 : 0;

    rawProducts.push({
      nombre: defaultName,
      variante: '',
      cantidad: 1,
      precioUnitario: precio,
    });
  }

  return {
    cliente: '',
    telefono: '',
    lugarEntrega: '',
    observaciones: '',
    pagado: 0,
    productos: rawProducts,
    rawTranscription: transcription,
  };
}

// Deduplicate and consolidate products in case speech recognition caught repetitions
function deduplicateProducts(items: Array<{ nombre: string; variante: string; cantidad: number; precioUnitario: number }>) {
  if (!items || items.length === 0) return [];
  
  const merged: Array<{ nombre: string; variante: string; cantidad: number; precioUnitario: number }> = [];

  for (const item of items) {
    const cleanName = (item.nombre || '').trim().toLowerCase();
    const cleanVariant = (item.variante || '').trim().toLowerCase();

    if (!cleanName) continue;

    // Check if an existing product matches closely (same name and variant)
    const existingIndex = merged.findIndex(
      (m) =>
        m.nombre.trim().toLowerCase() === cleanName &&
        (m.variante || '').trim().toLowerCase() === cleanVariant
    );

    if (existingIndex >= 0) {
      if (merged[existingIndex].precioUnitario === 0 && item.precioUnitario > 0) {
        merged[existingIndex].precioUnitario = item.precioUnitario;
      }
      if (item.cantidad > 1) {
        merged[existingIndex].cantidad = Math.max(merged[existingIndex].cantidad, item.cantidad);
      }
    } else {
      merged.push({
        nombre: item.nombre.trim(),
        variante: (item.variante || '').trim(),
        cantidad: Math.max(1, item.cantidad || 1),
        precioUnitario: Math.max(0, item.precioUnitario || 0),
      });
    }
  }

  return merged;
}

// Parse Voice / Text transcription into structured items & budget in Bolivianos
app.post('/api/parse-order', async (req, res) => {
  try {
    const { transcription } = req.body;

    if (!transcription || typeof transcription !== 'string' || !transcription.trim()) {
      return res.status(400).json({
        error: 'Por favor proporciona un texto o audio transcrito para analizar los artículos.',
      });
    }

    const cleanInput = transcription.trim();

    try {
      const ai = getGeminiClient();

      const systemInstruction = `
Eres un asistente experto para una tienda de TikTok en Bolivia de papelería bonita/kawaii y mochilas temáticas (Kuromi, Stitch, Spiderman, Mario, Sanrio, etc.).

TU MISIÓN PRINCIPAL:
Extraer EXCLUSIVAMENTE la lista de artículos, productos y el presupuesto/precios en BOLIVIANOS (Bs.) a partir del dictado o texto.

REGLAS ESTRICTAS:
1. Concéntrate 100% en los ARTÍCULOS y PRECIOS:
   - "nombre": Nombre claro del artículo (ej. "Mochila Temática Kuromi", "Set Plumones 36 Colores", "Cartuchera Triple Spiderman", "Libreta Pasta Dura").
   - "variante": Color, personaje, modelo o tamaño si se menciona (ej. "Morado / Grande", "Azul", "Pastel"). Si no tiene, dejar "".
   - "cantidad": Cantidad exacta en unidades (número entero >= 1). Si no se especifica número, asumir 1.
   - "precioUnitario": Precio por unidad en BOLIVIANOS (Bs.). Si en el texto dice "a 180 Bs" o "por 180" o "180 cada una", coloca 180. Si no se indica precio, coloca 0.

2. REPETICIONES Y DEDUPLICACIÓN:
   - Si en el dictado la persona titubea o repite el mismo producto (ej. "una mochila... sí una mochila de kuromi"), NUNCA pongas dos veces la mochila.
   - Consolida en un solo ítem con la cantidad correcta.

3. DESTINATARIO:
   - Los datos del destinatario, teléfono y entrega los llenará el vendedor a mano. Deja siempre "cliente": "", "telefono": "", "lugarEntrega": "", "observaciones": "". Si se menciona un pago o anticipo específico, puedes registrarlo en "pagado" (número en Bs., por defecto 0).
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Analiza esta lista de compras / pedido en Bolivia y extrae los productos con sus precios en Bolivianos:\n"""${cleanInput}"""`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cliente: { type: Type.STRING, description: 'Dejar cadena vacía' },
              telefono: { type: Type.STRING, description: 'Dejar cadena vacía' },
              lugarEntrega: { type: Type.STRING, description: 'Dejar cadena vacía' },
              observaciones: { type: Type.STRING, description: 'Notas si se mencionan' },
              pagado: { type: Type.NUMBER, description: 'Monto de anticipo en Bolivianos (0 por defecto)' },
              productos: {
                type: Type.ARRAY,
                description: 'Lista de artículos pedidos con sus precios en Bolivianos',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    nombre: { type: Type.STRING, description: 'Nombre del producto' },
                    variante: { type: Type.STRING, description: 'Variante, color o modelo' },
                    cantidad: { type: Type.INTEGER, description: 'Cantidad pedida' },
                    precioUnitario: { type: Type.NUMBER, description: 'Precio unitario en Bolivianos (Bs.)' },
                  },
                  required: ['nombre', 'cantidad', 'precioUnitario'],
                },
              },
            },
            required: ['productos'],
          },
        },
      });

      let rawText = response.text || '{}';
      rawText = rawText.trim();
      if (rawText.startsWith('```json')) {
        rawText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      } else if (rawText.startsWith('```')) {
        rawText = rawText.replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      }

      const parsedData = JSON.parse(rawText);

      // Raw products parsing
      const rawProducts = Array.isArray(parsedData.productos)
        ? parsedData.productos.map((item: any) => ({
            nombre: String(item.nombre || 'Artículo').trim(),
            variante: String(item.variante || '').trim(),
            cantidad: Math.max(1, parseInt(item.cantidad, 10) || 1),
            precioUnitario: Math.max(0, parseFloat(item.precioUnitario) || 0),
          }))
        : [];

      // Apply programmatic deduplication filter
      const safeProducts = deduplicateProducts(rawProducts);

      if (safeProducts.length === 0) {
        safeProducts.push({
          nombre: 'Mochila / Papelería',
          variante: '',
          cantidad: 1,
          precioUnitario: 0,
        });
      }

      return res.json({
        success: true,
        data: {
          cliente: '',
          telefono: '',
          lugarEntrega: '',
          observaciones: String(parsedData.observaciones || '').trim(),
          pagado: Math.max(0, parseFloat(parsedData.pagado) || 0),
          productos: safeProducts,
          rawTranscription: cleanInput,
        },
      });
    } catch (geminiError: any) {
      console.warn('Gemini extraction fallback for Bolivia items:', geminiError);
      const fallbackData = fallbackHeuristicParse(cleanInput);
      return res.json({
        success: true,
        data: fallbackData,
        warning: 'Artículos extraídos con el analizador de respaldo en Bolivianos.',
      });
    }
  } catch (error: any) {
    console.error('Fatal error in /api/parse-order:', error);
    return res.status(500).json({
      error: error.message || 'Error al procesar la lista de compra.',
    });
  }
});

// Helper fallback for VIKA chat in case Gemini is unreachable
function vikaFallbackResponse(message: string, context?: any) {
  const text = message.toLowerCase();
  const orders: any[] = (context && Array.isArray(context.orders)) ? context.orders : [];

  const totalVendido = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCobrado = orders.reduce((sum, o) => sum + (o.pagado || 0), 0);
  const totalPorCobrar = orders.reduce((sum, o) => sum + (o.saldo || 0), 0);
  const pedidosAbiertos = orders.filter((o) => o.estado === 'Abierto');

  // Check for change / vuelto calculation (e.g. "cuenta de 150 pago con 200")
  const changeMatch = text.match(/(?:cuenta|total|de)?\s*(?:de)?\s*(\d+(?:\.\d+)?)\s*(?:bs\.?|bolivianos)?\s*(?:y\s*)?(?:paga[rn]?|con|pago|billete)?\s*(?:de|con)?\s*(\d+(?:\.\d+)?)/i);
  if (text.includes('cambio') || text.includes('vuelto') || text.includes('vueltos')) {
    const numbers = text.match(/\d+(?:\.\d+)?/g);
    if (numbers && numbers.length >= 2) {
      const val1 = parseFloat(numbers[0]);
      const val2 = parseFloat(numbers[1]);
      const total = Math.min(val1, val2);
      const paid = Math.max(val1, val2);
      const cambio = paid - total;
      return {
        reply: `💰 **Cálculo de Cambio:**\n- Total de la cuenta: **Bs. ${total.toFixed(2)}**\n- Cliente paga con: **Bs. ${paid.toFixed(2)}**\n👉 **Debes entregar de vuelto: Bs. ${cambio.toFixed(2)}**`,
        quickCalculations: { totalBs: total, cambioBs: cambio },
      };
    }
  }

  // Check for stats / money summary
  if (text.includes('caja') || text.includes('dinero') || text.includes('por cobrar') || text.includes('saldos') || text.includes('resumen')) {
    return {
      reply: `📊 **Resumen de Caja (Bolivia):**\n- Total recaudado/cobrado: **Bs. ${totalCobrado.toFixed(2)}**\n- Total pendiente por cobrar: **Bs. ${totalPorCobrar.toFixed(2)}** (en ${pedidosAbiertos.length} pedidos abiertos)\n- Ventas registradas: **Bs. ${totalVendido.toFixed(2)}**`,
      quickCalculations: { totalBs: totalVendido },
    };
  }

  // Check for order creation request
  if (text.includes('pedido') || text.includes('mochila') || text.includes('kuromi') || text.includes('stitch') || text.includes('libreta') || text.includes('plumon')) {
    const extracted = fallbackHeuristicParse(message);
    const sumTotal = extracted.productos.reduce((acc, p) => acc + (p.cantidad * p.precioUnitario), 0);
    return {
      reply: `🎒 ¡Listo! He preparado el listado de compra para tu pedido:\n${extracted.productos.map(p => `• **${p.cantidad}x ${p.nombre}** ${p.variante ? `(${p.variante})` : ''} - Bs. ${p.precioUnitario} c/u`).join('\n')}\n\n💵 **Total presupuesto:** **Bs. ${sumTotal.toFixed(2)}**.\n\nPuedes presionar el botón de abajo para cargarlo directamente a **Nuevo Pedido**.`,
      suggestedOrder: {
        productos: extracted.productos,
        pagado: extracted.pagado,
      },
      quickCalculations: { totalBs: sumTotal },
    };
  }

  return {
    reply: `¡Hola! Soy **VIKA**, tu agente de ventas y finanzas para la tienda en Bolivia 🇧🇴.\n\nPuedo ayudarte a:\n1. 🎒 **Armar pedidos y presupuestos** al instante por voz o texto.\n2. 💰 **Calcular cambios/vueltos**, descuentos de combos en vivo.\n3. 📊 **Controlar tu dinero en caja** y saldos por cobrar.\n\n¿Qué deseas consultar o calcular?`,
  };
}

// VIKA AI Assistant endpoint
app.post('/api/vika-chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Por favor envía un mensaje a VIKA.' });
    }

    const cleanMessage = message.trim();
    const orders: any[] = (context && Array.isArray(context.orders)) ? context.orders : [];

    const totalVendido = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalCobrado = orders.reduce((sum, o) => sum + (o.pagado || 0), 0);
    const totalPorCobrar = orders.reduce((sum, o) => sum + (o.saldo || 0), 0);
    const openOrdersCount = orders.filter((o) => o.estado === 'Abierto').length;

    try {
      const ai = getGeminiClient();

      const systemInstruction = `
Eres VIKA, la asistente virtual y copiloto de ventas de una tienda en Bolivia especializada en mochilas temáticas (Kuromi, Stitch, Spiderman, anime) y papelería kawaii/escolar (cuadernos, libretas, bolígrafos, plumones, gomas, tajadores, estuches, stickers) por TikTok Live y WhatsApp.

TU ROL Y OBJETIVO PRINCIPAL:
1. Tu trabajo principal es ESCUCHAR O LEER el dictado del vendedor y EXTRAER LA LISTA EXACTA DE PRODUCTOS Y SUS CANTIDADES/PRESENTACIONES.
2. NO te compliques con cálculos de precios si no se mencionan explícitamente: el vendedor colocará los precios unitarios al final en el formulario. Si no menciona precios, asigna precioUnitario: 0. Si menciona precios específicos, puedes incluirlos.
3. Debes entender perfectamente las presentaciones de venta en Bolivia:
   - BOX / CAJA: "box de 24", "box de 36", "box de 48", "box de 60" unidades (o la cantidad de piezas especificada).
   - DOCENA: "1 docena", "2 docenas" (12 unidades c/u).
   - MEDIA DOCENA: "media docena" (6 unidades).
   - UNIDAD: "1 unidad", "2 piezas", etc.

REGLAS DE EXTRACCIÓN DE PRODUCTOS:
- Extrae cada producto como un elemento separado en la lista "productos":
  * "nombre": Nombre limpio del producto (ej: "Gomas Kitty", "Bolígrafos Sanrio", "Tajadores Kuromi", "Mochila Spiderman").
  * "variante": La presentación o empaque exacto (ej: "Box de 48 u.", "Docena (12 u.)", "Box de 24 u.", "Media Docena (6 u.)", "Box de 36 u.", "Box de 60 u.", "Unidad", o color si se menciona).
  * "cantidad": La cantidad de cajas, docenas o unidades pedidas (ej: si dijo "1 box de 48", cantidad: 1; si dijo "2 docenas", cantidad: 2).
  * "precioUnitario": Si se mencionó precio unitario en Bs., colócalo; si no se mencionó, coloca 0.

EJEMPLO DE DICTADO:
- Entrada: "arma un pedido de 1 box de 48 de gomas Kitty más una docena de bolígrafos Sanrio más 1 box de 24 de TAJADORES KUROMI"
- Lista generada:
  1. 1 Box de 48 u. - Gomas Kitty (variante: "Box de 48 u.", cantidad: 1, precio: 0)
  2. 1 Docena (12 u.) - Bolígrafos Sanrio (variante: "Docena (12 u.)", cantidad: 1, precio: 0)
  3. 1 Box de 24 u. - Tajadores Kuromi (variante: "Box de 24 u.", cantidad: 1, precio: 0)

DATOS DEL CLIENTE Y ENTREGA (Opcional):
- Si el vendedor menciona cliente (ej: "para Camila", "a nombre de Juan"), inclúyelo en "cliente".
- Si menciona teléfono o WhatsApp (ej: "al 71234567"), inclúyelo en "telefono".
- Si menciona lugar (ej: "Teleférico Morado", "Ceja El Alto", "Cochabamba"), inclúyelo en "lugarEntrega".
- Si no se mencionan, déjalos vacíos o sugiere amablemente en tu respuesta de texto si desea agregarlos.

RESPUESTA CONVERSACIONAL (reply):
- Sé clara, alegre y estructurada en Markdown:
  * Enumera cada artículo con viñetas claras resaltando la presentación (📦 Box 48u, 🎁 Docena, 🏷️ Unidad).
  * Explica que la lista está lista y puede presionar **«Cargar a Nuevo Pedido y Asignar Precios»** para colocar los precios y que el sistema sume el total en Bs. automáticamente.
  * Opcionalmente pregunta: *"¿Deseas agregar el nombre del cliente y WhatsApp, o lo abrimos directo en el formulario?"*

DATOS ACTUALES DE LA TIENDA EN EL SISTEMA:
- Pedidos registrados: ${orders.length}
- Pedidos abiertos (pendientes): ${openOrdersCount}
- Total en caja cobrado: Bs. ${totalCobrado.toFixed(2)}
- Total por cobrar (saldos): Bs. ${totalPorCobrar.toFixed(2)}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Mensaje del usuario:\n"""${cleanMessage}"""`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: 'Respuesta en Markdown' },
              suggestedOrder: {
                type: Type.OBJECT,
                description: 'Pedido estructurado listo para registrar',
                properties: {
                  cliente: { type: Type.STRING },
                  telefono: { type: Type.STRING },
                  lugarEntrega: { type: Type.STRING },
                  observaciones: { type: Type.STRING },
                  productos: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        nombre: { type: Type.STRING },
                        variante: { type: Type.STRING },
                        cantidad: { type: Type.INTEGER },
                        precioUnitario: { type: Type.NUMBER },
                      },
                      required: ['nombre', 'cantidad', 'precioUnitario'],
                    },
                  },
                  pagado: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  saldo: { type: Type.NUMBER },
                },
              },
              quickCalculations: {
                type: Type.OBJECT,
                properties: {
                  totalBs: { type: Type.NUMBER },
                  cambioBs: { type: Type.NUMBER },
                  ahorroBs: { type: Type.NUMBER },
                },
              },
              suggestedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['reply'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        data: parsed,
      });
    } catch (geminiError) {
      console.warn('VIKA chat fallback used:', geminiError);
      const fallback = vikaFallbackResponse(cleanMessage, context);
      return res.json({
        success: true,
        data: fallback,
      });
    }
  } catch (error: any) {
    console.error('Fatal error in /api/vika-chat:', error);
    return res.status(500).json({ error: error.message || 'Error en asistente VIKA.' });
  }
});

// Vite & Static file serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ventasIA server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
