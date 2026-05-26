import { 
  History, User 
} from 'lucide-react';
import { AuditLog } from '../types';

interface SystemLogsViewProps {
  logs: AuditLog[];
}

export default function SystemLogsView({ logs }: SystemLogsViewProps) {
  const getActionColor = (action: string): string => {
    switch (action) {
      case 'CREATE': 
      case 'UPDATE_ACCESS': 
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPDATE': 
      case 'UPDATE_CHECK': 
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DELETE': 
      case 'REMOVE_ACCESS': 
      case 'CLEAR_ALL': 
        return 'bg-red-50 text-red-700 border-red-200';
      case 'FUND': 
      case 'RECEIVE': 
      case 'IMPORT': 
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'UNFUND': 
      case 'RESET_FUNDING': 
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default: 
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center">
          <History className="mr-2 text-indigo-600" size={20} /> System Audit Logs
        </h3>
        <p className="text-xs text-gray-500 mt-1">A chronological history of all data modifications made in the dashboard.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">User</th>
              <th className="p-4">Action</th>
              <th className="p-4">Target Ref</th>
              <th className="p-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 italic">No logs found matching your search.</td>
              </tr>
            ) : (
              logs.map(log => {
                const dateObj = new Date(log.timestamp);
                return (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors align-top">
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-bold text-gray-800">{dateObj.toLocaleDateString()}</div>
                      <div className="text-[10px] text-gray-500">{dateObj.toLocaleTimeString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center text-gray-700 font-medium">
                        <User size={14} className="mr-1.5 text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[150px]" title={log.user}>{log.user}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 truncate max-w-[150px]" title={log.entityId}>{log.entityId}</div>
                      <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{log.entityType}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-[11px] text-gray-600 font-mono bg-slate-50 border border-slate-100 p-2 rounded break-words">
                        {log.details}
                      </div>
                    </td>
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
