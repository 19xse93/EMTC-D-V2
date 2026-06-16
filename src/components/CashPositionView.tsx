import { useState } from 'react';
import { 
  CalendarDays, Check, Trash2 
} from 'lucide-react';
import { ApvRecord, UserPermissions } from '../types';
import { formatCurrency, safeParseDate, getWeekRange } from '../utils';

interface CashPositionViewProps {
  apvs: ApvRecord[];
  userPermissions: UserPermissions;
  confirmResetFunding: (apv: ApvRecord) => void;
  today: Date;
}

export default function CashPositionView({
  apvs,
  userPermissions,
  confirmResetFunding,
  today
}: CashPositionViewProps) {
  const weeklyFunding: { [weekLabel: string]: { week: string; sortKey: number; totalAmount: number; apvs: ApvRecord[] } } = {};

  apvs.filter(a => a.funded || a.status === 'Paid').forEach(apv => {
    const dateToUse = apv.fundedDate || apv.settledDate || apv.dueDate || today.toISOString().split('T')[0];
    const weekLabel = getWeekRange(dateToUse, today);
    const sortKey = safeParseDate(dateToUse)?.getTime() || 0;

    if (!weeklyFunding[weekLabel]) {
      weeklyFunding[weekLabel] = { week: weekLabel, sortKey: sortKey, totalAmount: 0, apvs: [] };
    }
    weeklyFunding[weekLabel].totalAmount += Number(apv.amount || 0);
    weeklyFunding[weekLabel].apvs.push(apv);
  });

  const sortedWeeks = Object.values(weeklyFunding).sort((a, b) => b.sortKey - a.sortKey);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
            <CalendarDays className="mr-2 text-indigo-600" size={24} /> Cash Position Report
          </h3>
          <p className="text-xs md:text-sm text-gray-500 mt-1">A historical breakdown of APVs grouped by the week they were funded.</p>
        </div>
      </div>

      {sortedWeeks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500 italic">
          No funded APVs match your search.
        </div>
      ) : (
        sortedWeeks.map(weekGroup => (
          <div key={weekGroup.week} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6 animate-in fade-in">
            <div className="px-4 md:px-6 py-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-sm md:text-base uppercase tracking-wider">Week of {weekGroup.week}</h4>
              <span className="font-black text-indigo-700 text-lg md:text-xl">{formatCurrency(weekGroup.totalAmount)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 uppercase bg-white bg-opacity-0">
                    <th className="p-4 font-semibold">APV #</th>
                    <th className="p-4 font-semibold">Vendor & Business Unit</th>
                    <th className="p-4 font-semibold">Funded Date</th>
                    <th className="p-4 font-semibold">Collection Info</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    {userPermissions.manageTreasury && <th className="p-4 font-semibold text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {weekGroup.apvs.map(apv => (
                    <tr key={apv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-gray-900">{apv.id}</td>
                      <td className="p-4">
                        <div className="font-medium text-gray-800">{apv.vendor}</div>
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{apv.fundedDate || apv.settledDate || 'Legacy'}</td>
                      <td className="p-4">
                        {apv.checkStatus === 'Collected' || apv.status === 'Paid' ? (
                          <div className="text-[10px]">
                            {apv.checkNumber && <div><span className="text-gray-400 font-bold uppercase">CHK:</span> {apv.checkNumber}</div>}
                            <div className="text-emerald-600 font-bold uppercase mt-0.5">
                              <Check size={10} className="inline mr-0.5"/> Collected: {apv.releaseDate || apv.settledDate}
                            </div>
                          </div>
                        ) : apv.checkNumber ? (
                          <div className="text-[10px]">
                            <div><span className="text-gray-400 font-bold uppercase">CHK:</span> {apv.checkNumber}</div>
                            <div className="text-amber-500 font-bold uppercase mt-0.5">
                              {apv.checkStatus === 'Prepared' ? 'Check Created' : (apv.checkStatus || 'Check Created')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Pending Check</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="font-black text-gray-900">{formatCurrency(apv.amount)}</div>
                        {apv.withheldTax && apv.withheldTax > 0 ? (
                          <div className="text-[9px] font-semibold text-amber-600 leading-tight">
                            EWT: -{formatCurrency(apv.withheldTax)}
                          </div>
                        ) : null}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block border uppercase tracking-wider ${apv.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                          {apv.status === 'Paid' ? 'Paid' : 'Funded'}
                        </span>
                      </td>
                      {userPermissions.manageTreasury && (
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => confirmResetFunding(apv)} 
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" 
                            title="Delete Check Details & Funding"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
