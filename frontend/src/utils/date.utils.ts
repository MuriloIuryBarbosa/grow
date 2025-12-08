/**
 * Utilitários para manipulação de datas
 */

/**
 * Parse seguro de strings de data, normalizando formatos
 * Aceita: '2025-12-08', '2025-12-08 16:00:00', '2025-12-08T16:00:00'
 */
export function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) {
    return new Date();
  }

  try {
    // Normalizar formato: substituir espaço por T se necessário
    let normalized = dateStr.trim();
    
    if (normalized.includes(' ') && !normalized.includes('T')) {
      normalized = normalized.replace(' ', 'T');
    }
    
    // Se não tiver parte de hora, adicionar
    if (!normalized.includes('T')) {
      normalized += 'T00:00:00';
    }
    
    const date = new Date(normalized);
    
    // Verificar se é uma data válida
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date string: ${dateStr}, returning current date`);
      return new Date();
    }
    
    return date;
  } catch (err) {
    console.error(`Error parsing date: ${dateStr}`, err);
    return new Date();
  }
}

/**
 * Valida se uma string é uma data válida
 */
export function isValidDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  
  try {
    const date = parseDate(dateStr);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Formata data para exibição local (dd/MM/yyyy)
 */
export function formatDateLocal(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata data para input (yyyy-MM-dd)
 */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
