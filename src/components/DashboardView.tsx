import { useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, DollarSign, AlertCircle, 
  CheckCircle, Activity, Truck, Building, PiggyBank, FileSignature 
} from 'lucide-react';
import { PurchaseOrder, ApvRecord } from '../types';
import { formatCurrency } from '../utils';

interface DashboardViewProps {
  purchases: PurchaseOrder[];
  apvs: ApvRecord[];
  dbError: boolean;
  dbErrorMessage: string;
  totalPurchases: number;
  totalSavings: number;
  totalOutstanding: number;
  totalPaidChecks: number;
  totalPendingChecks: number;
  pastDuePayables: number;
  prToPoCompliance: number;
  avgProcessingTime: string | number;
  avgOverallLeadTime: number;
  avgOverallVariance: number;
  supplierDeliveryList: Array<{
    vendor: string;
    avgLead: number | null;
    avgNeed: number | null;
    totalOrders: number;
  }>;
}

export default function DashboardView({
  purchases,
  apvs,
  dbError,
  dbErrorMessage,
  totalPurchases,
  totalSavings,
  totalOutstanding,
  totalPaidChecks,
  totalPendingChecks,
  pastDuePayables,
  prToPoCompliance,
  avgProcessingTime,
  avgOverallLeadTime,
  avgOverallVariance,
  supplierDeliveryList
}: DashboardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 items-start">
      {dbError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 md:p-6 rounded-xl flex items-start shadow-sm">
          <AlertCircle className="mr-3 shrink-0 mt-0.5 text-red-600" size={24} />
          <div>
            <h3 className="font-bold text-base md:text-lg mb-1">Database Connection Error</h3>
            <p className="text-xs md:text-sm mt-1 text-red-700">The dashboard could not authenticate or fetch data from Firebase. Ensure your configuration is correct.</p>
            {dbErrorMessage && <p className="mt-3 text-[10px] md:text-xs font-mono bg-red-100 p-2 rounded break-words">Log: {dbErrorMessage}</p>}
          </div>
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center pt-4 xl:pt-0">
          <LayoutDashboard className="mr-2 text-indigo-500" size={20} /> Financial Overview
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-blue-50 rounded-lg text-blue-600 self-start sm:self-auto"><ShoppingCart size={20}/></div>
            <div>
              <p className="text-[10px] md:text-xs text-gray-500 font-medium">Total Purchases</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900">{formatCurrency(totalPurchases)}</h3>
            </div>
          </div>
          
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-emerald-50 rounded-lg text-emerald-600 self-start sm:self-auto"><PiggyBank size={20}/></div>
            <div>
              <p className="text-[10px] md:text-xs text-gray-500 font-medium font-sans">Cost Savings</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900">{formatCurrency(totalSavings)}</h3>
            </div>
          </div>

          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-rose-50 rounded-lg text-rose-600 self-start sm:self-auto"><DollarSign size={20}/></div>
            <div>
              <p className="text-[10px] md:text-xs text-gray-500 font-medium">Total Outstanding APV</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</h3>
            </div>
          </div>

          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-amber-50 rounded-lg text-amber-600 self-start sm:self-auto shrink-0"><AlertCircle size={20}/></div>
            <div className="min-w-0 flex-1 w-full">
              <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">Past Due Payables</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900 truncate" title={formatCurrency(pastDuePayables)}>{formatCurrency(pastDuePayables)}</h3>
            </div>
          </div>

          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-purple-50 rounded-lg text-purple-600 self-start sm:self-auto shrink-0"><FileSignature size={20}/></div>
            <div className="min-w-0 flex-1 w-full">
              <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate font-sans">Pending Checks</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900 truncate" title={formatCurrency(totalPendingChecks)}>{formatCurrency(totalPendingChecks)}</h3>
            </div>
          </div>

          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="p-2 md:p-3 bg-teal-50 rounded-lg text-teal-600 self-start sm:self-auto shrink-0"><CheckCircle size={20}/></div>
            <div className="min-w-0 flex-1 w-full">
              <p className="text-[10px] md:text-xs text-gray-500 font-medium truncate">Paid / Released</p>
              <h3 className="text-sm md:text-xl font-bold text-gray-900 truncate" title={formatCurrency(totalPaidChecks)}>{formatCurrency(totalPaidChecks)}</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center h-[320px]">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <Activity className="mr-2 text-indigo-500" size={18} /> PR to PO Processing
            </h3>
            <h4 className="text-3xl md:text-4xl font-bold text-gray-900">
              {prToPoCompliance}% <span className="text-sm text-gray-500 font-medium ml-1">Compliance</span>
            </h4>
            <p className="text-xs text-gray-500 mt-2 italic">Target: ≤ 3 days (Avg: {avgProcessingTime} days)</p>
          </div>

          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[320px]">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 flex items-center shrink-0">
              <Truck className="mr-2 text-orange-500" size={18} /> Supplier Delivery Averages
            </h3>
            <div className="flex gap-4 items-end mb-4 shrink-0">
              <div>
                <h4 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {avgOverallLeadTime} <span className="text-sm text-gray-500 font-medium">days</span>
                </h4>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium">PO to Delivery</p>
              </div>
              <div className="border-l border-gray-200 pl-4">
                <h4 className="text-xl md:text-2xl font-bold text-gray-700">
                  {avgOverallVariance > 0 ? `+${avgOverallVariance}` : avgOverallVariance} <span className="text-sm text-gray-500 font-medium">days</span>
                </h4>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium leading-tight">From Date of Need</p>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 relative">
              <table className="w-full text-left text-[10px] md:text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-100 text-gray-400 font-medium uppercase tracking-wider">
                    <th className="py-2 font-semibold bg-white">Supplier</th>
                    <th className="py-2 text-right font-semibold bg-white">PO-to-Del</th>
                    <th className="py-2 text-right font-semibold bg-white">From Need</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {supplierDeliveryList.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400 italic">No delivery data available</td>
                    </tr>
                  ) : (
                    supplierDeliveryList.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="py-2 font-medium text-gray-800 truncate max-w-[120px]" title={s.vendor}>
                          {s.vendor}
                        </td>
                        <td className="py-2 text-right font-bold text-indigo-600">
                          {s.avgLead !== null ? `${s.avgLead}d` : '-'}
                        </td>
                        <td className={`py-2 text-right font-bold ${s.avgNeed !== null && s.avgNeed > 0 ? 'text-amber-600' : s.avgNeed !== null && s.avgNeed < 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                          {s.avgNeed !== null ? (s.avgNeed > 0 ? `+${s.avgNeed}d` : `${s.avgNeed}d`) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
