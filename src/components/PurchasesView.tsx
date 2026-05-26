import { useState, useMemo } from 'react';
import { 
  Filter, Plus, Check, AlertCircle, Paperclip, Edit3, Trash2 
} from 'lucide-react';
import { PurchaseOrder, ApvRecord, UserPermissions } from '../types';
import { 
  formatCurrency, safeParseDate, getDeliveryStatus 
} from '../utils';

interface PurchasesViewProps {
  purchases: PurchaseOrder[];
  apvs: ApvRecord[];
  userPermissions: UserPermissions;
  poStatusFilter: string;
  setPoStatusFilter: (val: string) => void;
  openAddPo: () => void;
  openEditPo: (po: PurchaseOrder) => void;
  openReceiveModal: (po: PurchaseOrder) => void;
  handleDeletePo: (id: string) => void;
  setViewingImage: (data: string | null) => void;
  today: Date;
}

export default function PurchasesView({
  purchases,
  apvs,
  userPermissions,
  poStatusFilter,
  setPoStatusFilter,
  openAddPo,
  openEditPo,
  openReceiveModal,
  handleDeletePo,
  setViewingImage,
  today
}: PurchasesViewProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-3">
        <h3 className="text-base md:text-lg font-semibold text-gray-900">Purchase Orders</h3>
        <div className="flex flex-col sm:flex-row items-center w-full sm:w-auto gap-3">
          <div className="relative w-full sm:w-36">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={14} className="text-gray-400" />
            </div>
            <select 
              value={poStatusFilter} 
              onChange={e => setPoStatusFilter(e.target.value)} 
              className="w-full bg-white border border-gray-300 text-gray-900 text-xs md:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-8 pr-8 py-2 outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Invoiced">Invoiced</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
          {userPermissions.managePo && (
            <button 
              onClick={openAddPo} 
              className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center w-full sm:w-auto justify-center whitespace-nowrap hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <Plus size={16} className="mr-1" /> Add PO
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold uppercase">
              <th className="p-4 w-1/4">PO Details</th>
              <th className="p-4 w-1/3">Vendor & Remarks</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Amount</th>
              {(userPermissions.managePo || userPermissions.deleteRecords) && (
                <th className="p-4 text-center">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 italic">No records found.</td>
              </tr>
            ) : (
              purchases.map(po => {
                const linkedApv = apvs.find(a => a.poId === po.id);
                const isServiceOrRental = po.category === 'Site Rental' || po.category === 'Services';
                
                return (
                  <tr key={po.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="p-4">
                      <div className="font-bold text-indigo-600">{po.id}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5 mt-0.5">
                        {po.category && po.category !== 'General' && (
                          <span className="text-[9px] px-1.5 py-[1px] rounded bg-purple-50 text-purple-600 border border-purple-200 uppercase font-bold tracking-tighter">
                            {po.category}
                          </span>
                        )}
                        {po.paymentTerms === 'COD' && (
                          <span className="text-[9px] px-1.5 py-[1px] rounded bg-rose-50 text-rose-600 border border-rose-200 uppercase font-bold tracking-tighter">
                            COD
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mb-1.5 line-clamp-2" title={po.description}>
                        {po.description}
                      </div>
                      
                      {po.attachmentData && (
                        <button 
                          onClick={() => setViewingImage(po.attachmentData)} 
                          className="mb-2 text-[9px] flex items-center text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors px-2 py-1 rounded font-bold border border-blue-200 w-max cursor-pointer"
                        >
                          <Paperclip size={10} className="mr-1"/> View PR/PO File
                        </button>
                      )}

                      <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm mb-1.5">
                        <div className="text-[9px] text-gray-600 grid grid-cols-2 gap-x-2 gap-y-1">
                          <div className="truncate"><span className="font-bold text-gray-400 uppercase tracking-wider">PR Date:</span> {po.prReceivedDate || 'N/A'}</div>
                          <div className="truncate"><span className="font-bold text-gray-400 uppercase tracking-wider">PO Date:</span> {po.date || 'N/A'}</div>
                          <div className="truncate" title={po.prRequestor}>
                            <span className="font-bold text-gray-400 uppercase tracking-wider">Requestor:</span> {po.prRequestor || 'N/A'}
                          </div>
                          <div className="truncate" title={po.processorName}>
                            <span className="font-bold text-gray-400 uppercase tracking-wider">Processor:</span> {po.processorName || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {linkedApv ? (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 inline-flex items-center" 
                          title={`Linked APV: ${linkedApv.id}`}
                        >
                          <Check size={10} className="mr-1"/> APV: {linkedApv.id}
                        </span>
                      ) : (
                        <span 
                          className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-600 border border-amber-200 inline-flex items-center" 
                          title="No APV created yet"
                        >
                          <AlertCircle size={10} className="mr-1"/> No APV
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{po.vendor}</div>
                      {po.remarks && (
                        <div className="mt-1.5 p-2 bg-yellow-50 border border-yellow-105 rounded-lg text-[10px] text-yellow-800 italic break-words shadow-sm">
                          <span className="font-bold not-italic">Remarks:</span> {po.remarks}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border inline-block mt-1 ${getDeliveryStatus(po.expectedDelivery, po.receivedDate, po.category, today).color}`}>
                        {getDeliveryStatus(po.expectedDelivery, po.receivedDate, po.category, today).label}
                      </span>
                    </td>
                    <td className="p-4 text-right pt-5">
                      <div className="font-bold text-gray-900">{formatCurrency(po.amount)}</div>
                      {po.discountAmount > 0 && (
                        <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 inline-block mt-1">
                          Saved {formatCurrency(po.discountAmount)}
                        </div>
                      )}
                    </td>
                    {(userPermissions.managePo || userPermissions.deleteRecords) && (
                      <td className="p-4 text-center space-x-2 whitespace-nowrap pt-5">
                        {userPermissions.managePo && (
                          <button 
                            onClick={() => openEditPo(po)} 
                            className="text-gray-400 hover:text-indigo-600 transition-colors inline-block cursor-pointer" 
                            title="Edit PO"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                        {userPermissions.managePo && !po.receivedDate && (
                          <button 
                            onClick={() => openReceiveModal(po)} 
                            className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded font-bold transition-colors cursor-pointer"
                          >
                            {isServiceOrRental ? 'Complete' : 'Receive'}
                          </button>
                        )}
                        {userPermissions.deleteRecords && (
                          <button 
                            onClick={() => handleDeletePo(po.id)} 
                            className="text-gray-400 hover:text-red-500 transition-colors inline-block cursor-pointer" 
                            title="Delete PO"
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
