'use client';

import { useEffect, useState } from 'react';
import api from '@/utils/api';
import {
  Search, Shield, ShieldOff, ChevronLeft, ChevronRight,
  Loader2, UserCheck, UserX, RefreshCw,
} from 'lucide-react';

const ROLES = ['', 'landlord', 'tenant', 'admin', 'property_manager', 'law_reviewer'];
const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700',
  landlord: 'bg-indigo-100 text-indigo-700',
  property_manager: 'bg-amber-100 text-amber-700',
  tenant: 'bg-green-100 text-green-700',
  law_reviewer: 'bg-purple-100 text-purple-700',
};

export default function AdminUsersPage() {
  const [users, setUsers]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [activeFilter, setActive] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedUser, setSelectedUser]   = useState(null);
  const [newRole, setNewRole]   = useState('');

  const fetchUsers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search)       params.set('search', search);
      if (roleFilter)   params.set('role', roleFilter);
      if (activeFilter !== '') params.set('isActive', activeFilter);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(1); }, [search, roleFilter, activeFilter]);

  const handleBan = async (userId, name) => {
    if (!confirm(`Toggle ban status for ${name}?`)) return;
    setActionLoading(userId + '-ban');
    try {
      const { data } = await api.put(`/admin/users/${userId}/ban`);
      alert(data.message);
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async () => {
    if (!newRole || !selectedUser) return;
    setActionLoading(selectedUser._id + '-role');
    try {
      const { data } = await api.put(`/admin/users/${selectedUser._id}/role`, { role: newRole });
      alert(data.message);
      setSelectedUser(null);
      fetchUsers(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">User Management</h1>
          <p className="text-gray-400 text-sm mt-1">{pagination.total} total users</p>
        </div>
        <button onClick={() => fetchUsers(pagination.page)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            placeholder="Search name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRole(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Roles</option>
          {ROLES.filter(Boolean).map(r => (
            <option key={r} value={r}>{r.replace('_',' ')}</option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={e => setActive(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">User</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Role</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="text-left px-4 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Joined</th>
                <th className="text-right px-6 py-3 text-xs font-black uppercase tracking-widest text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-500'}`}>
                      {u.role.replace('_',' ')}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Banned'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setSelectedUser(u); setNewRole(u.role); }}
                        className="text-xs border border-gray-200 px-3 py-1.5 rounded-lg hover:border-blue-400 hover:text-blue-600 transition"
                      >
                        Change Role
                      </button>
                      <button
                        onClick={() => handleBan(u._id, u.name)}
                        disabled={actionLoading === u._id + '-ban'}
                        className={`text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                          u.isActive
                            ? 'bg-red-50 text-red-600 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {actionLoading === u._id + '-ban' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : u.isActive ? (
                          <><UserX className="w-3 h-3" /> Ban</>
                        ) : (
                          <><UserCheck className="w-3 h-3" /> Unban</>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-blue-400 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="p-2 border border-gray-200 rounded-lg disabled:opacity-40 hover:border-blue-400 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
            <h3 className="text-xl font-black text-gray-900 mb-1">Change Role</h3>
            <p className="text-gray-500 text-sm mb-6">{selectedUser.name}</p>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
            >
              {ROLES.filter(Boolean).map(r => (
                <option key={r} value={r}>{r.replace('_',' ')}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setSelectedUser(null)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-semibold hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleRoleChange}
                disabled={actionLoading === selectedUser._id + '-role'}
                className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-black hover:bg-blue-700 disabled:bg-blue-400 transition"
              >
                {actionLoading === selectedUser._id + '-role' ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
