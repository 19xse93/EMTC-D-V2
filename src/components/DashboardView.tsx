import { useMemo } from 'react';
import { 
  LayoutDashboard, ShoppingCart, DollarSign, AlertCircle, 
  CheckCircle, Activity, Truck, Building, PiggyBank, FileSignature,
  TrendingUp, BarChart3
} from 'lucide-react';
import { PurchaseOrder, ApvRecord } from '../types';
import { formatCurrency } from '../utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

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
  const last6Months = useMemo(() => {
    const list = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const label = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const key = `${year}-${month}`;
      list.push({ key, label });
    }
    return list;
  }, []);

  const chartData = useMemo(() => {
    return last6Months.map(({ key, label }) => {
      const unpaidApvsInMonth = apvs.filter(apv => {
        if (apv.status !== 'Unpaid') return false;
        if (!apv.invoiceDate) return false;
        return apv.invoiceDate.startsWith(key);
      });
      const totalAmount = unpaidApvsInMonth.reduce((sum, apv) => sum + Number(apv.amount || 0), 0);
      return {
        month: label,
        "Outstanding APV": totalAmount,
      };
    });
  }, [apvs, last6Months]);

  const topSuppliersData = useMemo(() => {
    const map: { [vendor: string]: number } = {};
    apvs.forEach(apv => {
      if (apv.status === 'Unpaid') {
        const amt = Number(apv.amount || 0);
        const v = apv.vendor || 'Unknown Vendor';
        map[v] = (map[v] || 0) + amt;
      }
    });
    return Object.entries(map)
      .map(([name, balance]) => ({
        name,
        "Outstanding Balance": balance
      }))
      .sort((a, b) => b["Outstanding Balance"] - a["Outstanding Balance"])
      .slice(0, 5);
  }, [apvs]);

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

        {/* Charts Section: Outstanding APV Trend & Top 5 Suppliers Outstanding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Outstanding APV Trend Line Chart */}
          <div id="apv-outstanding-trend" className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[350px]">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="mr-2 text-rose-500" size={18} /> Outstanding APV Trend (Last 6 Months)
            </h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
                      return `₱${val}`;
                    }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Outstanding APV']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="Outstanding APV" 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                    dot={{ r: 4, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 5 Suppliers by Outstanding Balance Bar Chart */}
          <div id="top-suppliers-outstanding" className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-[350px]">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="mr-2 text-indigo-500" size={18} /> Top 5 Suppliers by Outstanding Balance
            </h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuppliersData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis 
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(val) => {
                      if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
                      return `₱${val}`;
                    }}
                  />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Outstanding Balance']}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '8px', 
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar 
                    dataKey="Outstanding Balance" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]}
                  >
                    {topSuppliersData.map((_entry, index) => {
                      const colors = ['#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
