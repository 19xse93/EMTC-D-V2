import { 
  Users as UsersIcon, Plus, Shield, Edit3, Trash2 
} from 'lucide-react';
import { AppUser, UserPermissions } from '../types';

interface UserManagementViewProps {
  appUsers: AppUser[];
  userPermissions: UserPermissions;
  setNewUserAccount: (account: { email: string; permissions: UserPermissions }) => void;
  openUserModal: () => void;
  handleDeleteUser: (email: string) => void;
}

export default function UserManagementView({
  appUsers,
  userPermissions,
  setNewUserAccount,
  openUserModal,
  handleDeleteUser
}: UserManagementViewProps) {
  const mapAccessLevelToPermissions = (level: number): UserPermissions => {
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
    return p;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 gap-3">
        <h3 className="text-base md:text-lg font-semibold text-gray-900">User Access Control</h3>
        <button 
          onClick={() => {
            setNewUserAccount({ email: '', permissions: mapAccessLevelToPermissions(1) });
            openUserModal();
          }} 
          className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          <Plus size={16} className="mr-1" /> Add / Edit User Access
        </button>
      </div>
      <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-start text-xs text-indigo-800">
        <Shield size={20} className="mr-3 shrink-0 mt-0.5 text-indigo-600" />
        <div>
          <strong>Secure Firebase Auth is Active:</strong> Users and their passwords must be created in the <strong>Firebase Console &gt; Authentication</strong> dashboard first. Use this screen to assign specific granular access permissions to those authenticated emails.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="bg-white border-b border-gray-200 text-gray-500 font-semibold uppercase">
              <th className="p-4">Email Address</th>
              <th className="p-4">Active Permissions</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-400 italic">No custom access levels assigned yet.</td>
              </tr>
            ) : (
              appUsers.map(u => {
                const activePerms = Object.entries(u.permissions || {})
                  .filter(([k, v]) => v)
                  .map(([k]) => k);
                
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-900">{u.email}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {activePerms.length === 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-50 text-gray-500 border-gray-200 uppercase">
                            View Only
                          </span>
                        ) : (
                          activePerms.map(perm => (
                            <span 
                              key={perm} 
                              className="px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-600 border-indigo-200 uppercase tracking-tighter"
                            >
                              {perm.replace('manage', '').replace('Data', '').replace('Records', '')}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center space-x-2">
                      <button 
                        onClick={() => {
                          setNewUserAccount({ email: u.email, permissions: u.permissions || mapAccessLevelToPermissions(0) });
                          openUserModal();
                        }} 
                        className="text-gray-400 hover:text-indigo-600 transition-colors cursor-pointer" 
                        title="Edit Permissions"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)} 
                        className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" 
                        title="Revoke Specific Access"
                      >
                        <Trash2 size={16} />
                      </button>
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
