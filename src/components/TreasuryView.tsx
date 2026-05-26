import { useState } from 'react';
import { 
  Filter, Landmark, FileSignature, Check 
} from 'lucide-react';
import { ApvRecord, UserPermissions } from '../types';
import { formatCurrency } from '../utils';

interface TreasuryViewProps {
  apvs: ApvRecord[];
  userPermissions: UserPermissions;
  treasuryStatusFilter: string;
  setTreasuryStatusFilter: (val: string) => void;
  openFundModal: (apv?: ApvRecord) => void;
  openCheckModal: (apv?: ApvRecord) => void;
  handleUnfund: (apv: ApvRecord) => void;
  earmarkedAmt: number;
  preparedAmt: number;
  releasedAmt: number;
}

export default function TreasuryView({
  apvs,
  userPermissions,
  treasuryStatusFilter,
  setTreasuryStatusFilter,
  openFundModal,
  openCheckModal,
  handleUnfund,
  earmarkedAmt,
  preparedAmt,
  releasedAmt
}: TreasuryViewProps) {
  const sortedTreasury = apvs
    .filter(apv => {
      if (treasuryStatusFilter === 'All') return true;
      const isPaid = apv.status === 'Paid';
      const hasCheck = !!apv.checkNumber;
      if (treasuryStatusFilter === 'Pending Check') return !isPaid && !hasCheck;
      if (treasuryStatusFilter === 'Check Created') return !isPaid && hasCheck;
      if (treasuryStatusFilter === 'Released / Paid') return isPaid;
      return true;
    })
    .sort((a, b) => {
      if (a.status === 'Unpaid' && b.status === "Paid") return -1;
      if (a.status === 'Paid' && b.status === "Unpaid") return 1;
      return 0;
    });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
          <Landmark className="mr-2 text-indigo-600" size={20} /> Treasury Records
        </h3>
        
        <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-48">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-xs text-gray-400">🔍</span>
            </div>
            <select 
              value={treasuryStatusFilter} 
              onChange={e => setTreasuryStatusFilter(e.target.value)} 
              className="w-full bg-white border border-gray-300 text-gray-900 text-xs md:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-8 pr-8 py-2 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Pending Check">Pending Check</option>
              <option value="Check Created">Check Created</option>
              <option value="Released / Paid">Released / Paid</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-550">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
          
          {userPermissions.manageTreasury && (
            <div className="flex space-x-2 w-full sm:w-auto">
              <button 
                onClick={() => openFundModal()} 
                className="flex-1 sm:flex-none justify-center bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center cursor-pointer"
              >
                <Landmark size={14} className="mr-1"/> For Funding
              </button>
              <button 
                onClick={() => openCheckModal()} 
                className="flex-1 sm:flex-none justify-center bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center cursor-pointer"
              >
                <FileSignature size={14} className="mr-1"/> Create Check
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6 border-b border-gray-100 bg-slate-50">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
            Checks Created <span className="text-[8px] font-medium tracking-normal">(Waiting for Funding)</span>
          </p>
          <h3 className="text-xl md:text-2xl font-black text-amber-500">{formatCurrency(earmarkedAmt)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Total pending APVs awaiting check</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
            Check Funded <span className="text-[8px] font-medium tracking-normal">(Waiting for Pickup)</span>
          </p>
          <h3 className="text-xl md:text-2xl font-black text-indigo-600">{formatCurrency(preparedAmt)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Ready for vendor pickup</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">Cleared / Completed</p>
          <h3 className="text-xl md:text-2xl font-black text-emerald-600">{formatCurrency(releasedAmt)}</h3>
          <p className="text-[10px] text-gray-400 mt-1">Historically collected checks</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold uppercase">
              <th className="p-4">APV Ref</th>
              <th className="p-4">Vendor</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4">Check Details</th>
              <th className="p-4 text-center">Status</th>
              {userPermissions.manageTreasury && <th className="p-4 text-center">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedTreasury.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 italic">No records match your search.</td>
              </tr>
            ) : (
              sortedTreasury.map(apv => {
                const isCollected = apv.status === 'Paid';
                return (
                  <tr key={apv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{apv.id}</td>
                    <td className="p-4 font-medium">{apv.vendor}</td>
                    <td className="p-4 text-right font-black">{formatCurrency(apv.amount)}</td>
                    <td className="p-4">
                      {apv.checkNumber ? (
                        <div className="text-[10px] space-y-0.5">
                          <div><span className="text-gray-400 uppercase font-bold">CHK #:</span> <span className="font-medium text-gray-800">{apv.checkNumber}</span></div>
                          <div><span className="text-gray-400 uppercase font-bold">DATE:</span> <span className="font-medium text-gray-800">{apv.checkDate}</span></div>
                          {apv.releaseDate && <div><span className="text-gray-400 uppercase font-bold">RELEASED:</span> <span className="font-medium text-gray-800">{apv.releaseDate}</span></div>}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-500 italic font-medium">No check assigned</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold inline-block border ${isCollected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (apv.checkStatus === 'Check Created' || apv.checkStatus === 'Prepared') ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                        {apv.checkStatus === 'Prepared' ? 'Check Created' : (apv.checkStatus || 'Pending Check')}
                      </span>
                    </td>
                    {userPermissions.manageTreasury && (
                      <td className="p-4 text-center whitespace-nowrap space-x-2">
                        <button 
                          onClick={() => apv.funded ? handleUnfund(apv) : openFundModal(apv)} 
                          className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${apv.funded ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} 
                          title={apv.funded ? "Remove Funding" : "For Funding"}
                        >
                          <Landmark size={12} className="inline mr-1" /> {apv.funded ? 'Funded' : 'For Funding'}
                        </button>
                        <button 
                          onClick={() => openCheckModal(apv)} 
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          <FileSignature size={12} className="inline mr-1" /> Check
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
