import { useState } from 'react';
import { 
  Filter, Plus, AlertCircle, Check, Edit3, Trash2 
} from 'lucide-react';
import { ApvRecord, UserPermissions } from '../types';
import { 
  formatCurrency, getAgingCategory, getAgingColor 
} from '../utils';

interface ApvsViewProps {
  apvs: ApvRecord[];
  userPermissions: UserPermissions;
  apvStatusFilter: string;
  setApvStatusFilter: (val: string) => void;
  openAddApv: () => void;
  openEditApv: (apv: ApvRecord) => void;
  handleDeleteApv: (id: string) => void;
  today: Date;
}

export default function ApvsView({
  apvs,
  userPermissions,
  apvStatusFilter,
  setApvStatusFilter,
  openAddApv,
  openEditApv,
  handleDeleteApv,
  today
}: ApvsViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-3">
        <h3 className="text-base md:text-lg font-semibold text-gray-900">APV Records</h3>
        <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-36">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={14} className="text-gray-400" />
            </div>
            <select 
              value={apvStatusFilter} 
              onChange={e => setApvStatusFilter(e.target.value)} 
              className="w-full bg-white border border-gray-300 text-gray-900 text-xs md:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-8 pr-8 py-2 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
          {userPermissions.manageApv && (
            <button 
              onClick={openAddApv} 
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center w-full sm:w-auto justify-center whitespace-nowrap hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus size={16} className="mr-1" /> Add APV
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold uppercase">
              <th className="p-4">APV #</th>
              <th className="p-4">Vendor & Details</th>
              <th className="p-4 text-right">Amount</th>
              <th className="p-4 text-center">Aging</th>
              {(userPermissions.manageApv || userPermissions.deleteRecords) && (
                <th className="p-4 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {apvs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 italic">No records found.</td>
              </tr>
            ) : (
              apvs.map(apv => {
                const aging = getAgingCategory(apv.dueDate, apv.status, today);
                const needsCheck = apv.status === 'Unpaid' && !apv.checkNumber;
                
                return (
                  <tr key={apv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{apv.id}</td>
                    <td className="p-4">
                      <div className="font-medium">{apv.vendor}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 mb-1.5">
                        <span className="text-[10px] text-indigo-500">{apv.poId}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-[10px] text-gray-400 uppercase font-black">{apv.businessUnit}</span>
                        {apv.category && apv.category !== 'General' && (
                          <span className="text-[9px] px-1.5 py-[1px] rounded bg-purple-50 text-purple-600 border border-purple-200 uppercase font-bold tracking-tighter">
                            {apv.category}
                          </span>
                        )}
                      </div>
                      {needsCheck && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center" title="No check assigned yet">
                          <AlertCircle size={10} className="mr-1"/> Pending Check
                        </span>
                      )}
                      {apv.checkNumber && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center" title={`Check Number: ${apv.checkNumber}`}>
                          <Check size={10} className="mr-1"/> Check Assigned
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold">{formatCurrency(apv.amount)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAgingColor(aging)}`}>
                        {aging}
                      </span>
                    </td>
                    {(userPermissions.manageApv || userPermissions.deleteRecords) && (
                      <td className="p-4 text-center space-x-2 whitespace-nowrap">
                        {userPermissions.manageApv && (
                          <button 
                            onClick={() => openEditApv(apv)} 
                            className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer" 
                            title="Edit APV"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                        {userPermissions.deleteRecords && (
                          <button 
                            onClick={() => handleDeleteApv(apv.id)} 
                            className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" 
                            title="Delete APV"
                          >
                            <Trash2 size={16}/>
                          </button>
                        )}
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
