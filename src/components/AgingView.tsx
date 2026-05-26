import { useMemo } from 'react';
import { 
  Building, AlertCircle 
} from 'lucide-react';
import { ApvRecord, UserPermissions } from '../types';
import { 
  formatCurrency, getAgingCategory, getAgingBgColor, getAgingColor 
} from '../utils';

interface AgingViewProps {
  apvs: ApvRecord[];
  userPermissions: UserPermissions;
  agingSummary: { [cat: string]: number };
  weeklyNeedToPay: {
    Current: number;
    '1-30 Days': number;
    '31-60 Days': number;
    '61-90 Days': number;
    '> 90 Days': number;
    total: number;
  };
  vendorAging: Array<{
    name: string;
    total: number;
    Current: number;
    '1-30 Days': number;
    '31-60 Days': number;
    '61-90 Days': number;
    '> 90 Days': number;
  }>;
  endOfWeek: Date;
  today: Date;
}

export default function AgingView({
  apvs,
  userPermissions,
  agingSummary,
  weeklyNeedToPay,
  vendorAging,
  endOfWeek,
  today
}: AgingViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-gray-900">APV Aging Summary Report</h3>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            As of {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>
      
      <div className="p-4 md:p-6 border-b border-gray-100 bg-slate-50">
        <h4 className="text-xs md:text-sm font-semibold text-gray-900 mb-3 md:mb-4 flex items-center">
          <AlertCircle size={16} className="mr-2 text-indigo-600 shrink-0" />
          <span>Weekly Requirements <span className="hidden sm:inline">(Due by {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})</span></span>
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
            <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total Needed</div>
            <div className="text-xl md:text-2xl font-bold text-gray-900 break-all">
              {formatCurrency(weeklyNeedToPay.total)}
            </div>
          </div>
          <div className="lg:col-span-3 bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-[10px] md:text-xs text-gray-500 font-medium uppercase tracking-wider mb-3">Requirement by Category</div>
            {weeklyNeedToPay.total === 0 ? (
              <div className="text-xs md:text-sm text-gray-400 py-2">No payments required based on current search.</div>
            ) : (
              <div>
                <div className="flex h-3 md:h-4 w-full rounded-full overflow-hidden bg-gray-100 mb-3">
                  {['> 90 Days', '61-90 Days', '31-60 Days', '1-30 Days', 'Current'].map(category => {
                    const amount = (weeklyNeedToPay as any)[category] || 0; 
                    if (amount === 0) return null;
                    const percentage = ((amount / weeklyNeedToPay.total) * 100).toFixed(2);
                    return (
                      <div 
                        key={`bar-${category}`} 
                        style={{ width: `${percentage}%` }} 
                        className={`${getAgingBgColor(category)} transition-all`} 
                        title={`${category}: ${formatCurrency(amount)}`} 
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                  {['> 90 Days', '61-90 Days', '31-60 Days', '1-30 Days', 'Current'].map(category => {
                    const amount = (weeklyNeedToPay as any)[category] || 0;
                    return (
                      <div key={`legend-${category}`} className="text-left">
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${getAgingBgColor(category)}`}></div>
                          <span className="text-[9px] md:text-[10px] font-semibold text-gray-600 uppercase tracking-tighter truncate">{category}</span>
                        </div>
                        <p className={`text-[10px] md:text-xs font-bold truncate ${amount > 0 ? 'text-gray-900' : 'text-gray-400'}`} title={formatCurrency(amount)}>
                          {formatCurrency(amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto w-full">
        <table className="w-full text-right border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="p-3 md:p-4 font-semibold text-left">Vendor</th>
              <th className="p-3 md:p-4 font-semibold text-emerald-700 bg-emerald-50/50">Current</th>
              <th className="p-3 md:p-4 font-semibold text-yellow-700 bg-yellow-50/50">1-30 Days</th>
              <th className="p-3 md:p-4 font-semibold text-orange-700 bg-orange-50/50">31-60 Days</th>
              <th className="p-3 md:p-4 font-semibold text-red-700 bg-red-50/50">61-90 Days</th>
              <th className="p-3 md:p-4 font-semibold text-rose-700 bg-rose-50/50">&gt; 90 Days</th>
              <th className="p-3 md:p-4 font-semibold bg-gray-50">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendorAging.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-sm text-gray-500">No balances match your search.</td>
              </tr>
            ) : (
              vendorAging.map((v, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors group text-xs md:text-sm">
                  <td className="p-3 md:p-4 font-medium text-gray-900 text-left flex items-center max-w-[150px] truncate" title={v.name}>
                    <Building size={14} className="text-gray-400 mr-1.5 shrink-0" />
                    <span className="truncate">{v.name}</span>
                  </td>
                  <td className={`p-3 md:p-4 ${v['Current'] > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>{formatCurrency(v['Current'])}</td>
                  <td className={`p-3 md:p-4 ${v['1-30 Days'] > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>{formatCurrency(v['1-30 Days'])}</td>
                  <td className={`p-3 md:p-4 ${v['31-60 Days'] > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>{formatCurrency(v['31-60 Days'])}</td>
                  <td className={`p-3 md:p-4 ${v['61-90 Days'] > 0 ? 'text-gray-900 font-medium' : 'text-gray-300'}`}>{formatCurrency(v['61-90 Days'])}</td>
                  <td className={`p-3 md:p-4 ${v['> 90 Days'] > 0 ? 'text-rose-600 font-bold' : 'text-gray-300'}`}>{formatCurrency(v['> 90 Days'])}</td>
                  <td className="p-3 md:p-4 font-bold text-gray-900 bg-gray-50/50 group-hover:bg-gray-100/50 transition-colors">
                    {formatCurrency(v.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-200 text-xs md:text-sm">
            <tr>
              <td className="p-3 md:p-4 text-left text-gray-900">TOTAL</td>
              <td className="p-3 md:p-4 text-emerald-700">{formatCurrency(agingSummary['Current'])}</td>
              <td className="p-3 md:p-4 text-yellow-700">{formatCurrency(agingSummary['1-30 Days'])}</td>
              <td className="p-3 md:p-4 text-orange-700">{formatCurrency(agingSummary['31-60 Days'])}</td>
              <td className="p-3 md:p-4 text-red-700">{formatCurrency(agingSummary['61-90 Days'])}</td>
              <td className="p-3 md:p-4 text-rose-700">{formatCurrency(agingSummary['> 90 Days'])}</td>
              <td className="p-3 md:p-4 text-gray-900 text-sm md:text-base">
                {formatCurrency(
                  Object.values(agingSummary).reduce((a, b) => a + b, 0)
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
