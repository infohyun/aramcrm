'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Plus, Pencil } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PageLoading } from '@/components/ui/LoadingSpinner';

interface Department {
  id: string;
  name: string;
  code: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count: { users: number };
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const fetchDepartments = async () => {
    const res = await fetch('/api/departments');
    if (res.ok) setDepartments(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchDepartments(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setModalOpen(true);
  };

  const handleSave = async () => {
    const url = editing ? `/api/departments/${editing.id}` : '/api/departments';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setModalOpen(false);
    fetchDepartments();
  };

  if (loading) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">부서 관리</h2>
          <p className="text-sm text-gray-500 mt-1">조직의 부서를 관리합니다</p>
        </div>
        <Button onClick={openCreate} icon={<Plus size={16} />}>부서 추가</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <Card key={dept.id} hover onClick={() => openEdit(dept)}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Building2 size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{dept.name}</h3>
                  <p className="text-xs text-gray-400">{dept.code}</p>
                </div>
              </div>
              <button className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <Pencil size={14} />
              </button>
            </div>
            {dept.description && <p className="text-sm text-gray-500 mt-3">{dept.description}</p>}
            <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
              <Users size={14} />
              <span>{dept._count.users}명</span>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? '부서 수정' : '부서 추가'}>
        <div className="space-y-4">
          <Input label="부서명" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="부서 코드" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required disabled={!!editing} />
          <Input label="설명" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>취소</Button>
          <Button onClick={handleSave}>{editing ? '수정' : '추가'}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
