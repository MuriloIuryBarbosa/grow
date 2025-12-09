import { format, parseISO, differenceInDays } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Sao_Paulo';

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
    
    const date = parseISO(normalized);
    
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
  return format(d, 'dd/MM/yyyy');
}

/**
 * Formata data para input (yyyy-MM-dd)
 */
export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return format(d, 'yyyy-MM-dd');
}

/**
 * Formata data e hora para exibição (dd/MM/yyyy HH:mm)
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  return formatInTimeZone(d, TIMEZONE, 'dd/MM/yyyy HH:mm');
}

/**
 * Obtém data/hora atual no timezone de Brasília
 */
export function getBrasiliaDateTime(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

/**
 * Converte data local para ISO no timezone de Brasília
 */
export function convertToISOBrasilia(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Calcula diferença em dias entre duas datas
 */
export function daysDiff(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseDate(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDate(date2) : date2;
  
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format a date to display
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  try {
    const parsedDate = typeof date === 'string' ? parseDate(date) : date;
    return format(parsedDate, formatStr);
  } catch (err) {
    console.error('Error formatting date:', date, err);
    return 'Data inválida';
  }
}

/**
 * Calculate days between two dates
 */
export function daysBetween(startDate: string | Date, endDate: string | Date = new Date()): number {
  try {
    const start = typeof startDate === 'string' ? parseDate(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseDate(endDate) : endDate;
    return differenceInDays(end, start);
  } catch (err) {
    console.error('Error calculating days:', startDate, endDate, err);
    return 0;
  }
}
