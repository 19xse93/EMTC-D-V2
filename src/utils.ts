import { ApvRecord, PurchaseOrder, UserPermissions } from './types';

export const mapAccessLevelToPermissions = (level: number): UserPermissions => {
  const p = { 
    managePo: false, 
    manageApv: false, 
    manageTreasury: false, 
    deleteRecords: false, 
    manageUsers: false, 
    systemAdmin: false, 
    exportData: false 
  };
  if (level === 3) return { managePo: true, manageApv: true, manageTreasury: true, deleteRecords: true, manageUsers: true, systemAdmin: true, exportData: true };
  if (level === 4) return { ...p, manageTreasury: true, exportData: true };
  if (level === 2) return { ...p, managePo: true, manageApv: true, exportData: true };
  if (level === 1) return { ...p, exportData: true };
  return p; // level 0 or guest
};

export const formatCurrency = (amount: number): string => 
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);

export const standardizeDate = (val: string): string => {
  if (!val || typeof val !== 'string') return '';
  val = val.trim();
  if (!val) return '';
  if (!isNaN(val as any) && Number(val) > 20000 && Number(val) < 90000) {
    const excelDays = parseFloat(val);
    const d = new Date((excelDays - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  let d = new Date(val);
  if (isNaN(d.getTime())) {
    const parts = val.split(/[-/.]/); 
    if (parts.length === 3) {
      d = new Date(`${parts[1]}/${parts[0]}/${parts[2]}`);
      if (isNaN(d.getTime()) && parts[2].length === 2) {
        d = new Date(`${parts[1]}/${parts[0]}/20${parts[2]}`);
      }
    }
  }
  if (isNaN(d.getTime())) d = new Date(val.replace(/-/g, ' '));
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    if (year < 2000 || year > 2100) return ''; 
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return ''; 
};

export const safeParseDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (!isNaN(dateStr as any) && !isNaN(parseFloat(dateStr))) {
    const excelDays = parseFloat(dateStr);
    if (excelDays > 20000 && excelDays < 90000) {
      return new Date((excelDays - 25569) * 86400 * 1000);
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  if (d.getFullYear() < 2000 || d.getFullYear() > 2100) return null;
  return d;
};

export const formatMonthLabel = (monthStr: string): string => {
  try {
    if (!monthStr || typeof monthStr !== 'string') return 'Unknown';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (e) {
    return String(monthStr);
  }
};

export const getAgingCategory = (dueDate: string, status: string, today: Date): string => {
  if (status === 'Paid') return 'Paid';
  const due = safeParseDate(dueDate);
  if (!due) return 'Current'; 
  const diffTime = today.getTime() - due.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'Current';
  if (diffDays <= 30) return '1-30 Days';
  if (diffDays <= 60) return '31-60 Days';
  if (diffDays <= 90) return '61-90 Days';
  return '> 90 Days';
};

export const getAgingColor = (category: string): string => {
  switch (category) {
    case 'Current': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900';
    case '1-30 Days': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-900';
    case '31-60 Days': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900';
    case '61-90 Days': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900';
    case '> 90 Days': return 'bg-rose-600 text-white border-rose-700';
    case 'Paid': return 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

export const getAgingBgColor = (category: string): string => {
  switch (category) {
    case 'Current': return 'bg-emerald-500';
    case '1-30 Days': return 'bg-yellow-400';
    case '31-60 Days': return 'bg-orange-500';
    case '61-90 Days': return 'bg-red-500';
    case '> 90 Days': return 'bg-rose-700';
    default: return 'bg-gray-300';
  }
};

export const getWeekRange = (dateStr: string, today: Date): string => {
  const d = safeParseDate(dateStr) || new Date(today);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = new Date(d); 
  start.setDate(d.getDate() + diffToMonday);
  const end = new Date(start); 
  end.setDate(start.getDate() + 4);
  return `${start.toLocaleDateString('en-US', {month:'short', day:'numeric'})} - ${end.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})}`;
};

export const getDaysDiff = (startStr: string, endStr: string): number | null => {
  const s = safeParseDate(startStr); 
  const e = safeParseDate(endStr);
  if (!s || !e) return null;
  s.setHours(0,0,0,0); 
  e.setHours(0,0,0,0);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
};

export const getDeliveryStatus = (expectedDelivery: string, receivedDate: string | null, category: string, today: Date) => {
  const expected = safeParseDate(expectedDelivery);
  const isNoDelivery = category === 'Site Rental' || category === 'Services';

  if (!expected) {
    return { label: 'Invalid Date', color: 'bg-rose-100 text-rose-800 border-rose-200' };
  }
  
  if (receivedDate) {
    const received = safeParseDate(receivedDate);
    if (received) {
      if (isNoDelivery) return { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      return received <= expected ? 
        { label: 'Received', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' } : 
        { label: 'Received (Late)', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
  }
  
  const diffTime = Math.ceil((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
  if (diffTime > 0) {
    if (isNoDelivery) return { label: 'Past Target', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    return { 
      label: diffTime > 3650 ? 'Delayed' : `Delayed (${diffTime} days)`, 
      color: 'bg-rose-100 text-rose-800 border-rose-200' 
    };
  }
  
  if (isNoDelivery) return { label: 'Ongoing', color: 'bg-blue-100 text-blue-800 border-blue-200' };
  return { label: 'Pending Delivery', color: 'bg-blue-100 text-blue-800 border-blue-200' };
};

export const parseCSV = (text: string): any[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      let val = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : '';
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
};
