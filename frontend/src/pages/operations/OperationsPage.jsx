import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle, MessageSquare, Filter, Search } from 'lucide-react';
import { getTasks, createTask, updateTask, completeTask, addComment } from '../../api/operations';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { Input, Select, Textarea } from '../../components/common/Input';
import { useAuthStore } from '../../store/authStore';
import { PRIORITY_META, TASK_STATUS_META, formatDate, timeAgo, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };

function CreateTaskModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const mut = useMutation({
    mutationFn: createTask,
    onSuccess: () => { toast.success('Task created!'); onSuccess(); onClose(); setForm({ title: '', description: '', priority: 'medium', due_date: '' }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Create Operation Task" width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Follow up on expired documents" />
        <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Provide more context..." />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Priority" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
            {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </Select>
          <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate(form)}>Create Task</Button>
        </div>
      </div>
    </Modal>
  );
}

function TaskDetailModal({ task, open, onClose }) {
  const [comment, setComment] = useState('');
  const qc = useQueryClient();

  const completeMut = useMutation({
    mutationFn: () => completeTask(task.id),
    onSuccess: () => { toast.success('Task completed!'); qc.invalidateQueries(['tasks']); onClose(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const commentMut = useMutation({
    mutationFn: (content) => addComment(task.id, { content }),
    onSuccess: () => { toast.success('Comment added.'); qc.invalidateQueries(['tasks']); setComment(''); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const updateMut = useMutation({
    mutationFn: (data) => updateTask(task.id, data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Status updated.'); },
  });

  if (!task) return null;
  const pmeta = PRIORITY_META[task.priority] || {};
  const smeta = TASK_STATUS_META[task.status] || {};

  return (
    <Modal open={open} onClose={onClose} title={task.title} width={560}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge {...pmeta} />
          <Badge {...smeta} />
          {task.due_date && <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>Due: {formatDate(task.due_date)}</span>}
        </div>

        {task.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, background: 'var(--surface)', padding: '10px 14px', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--border)' }}>{task.description}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Status:</span>
          <Select value={task.status} onChange={e => updateMut.mutate({ status: e.target.value })} style={{ width: 'auto', padding: '5px 10px', fontSize: 13 }}>
            {Object.entries(TASK_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
          </Select>
          {task.status !== 'done' && <Button size="sm" variant="success" icon={<CheckCircle size={13} />} loading={completeMut.isPending} onClick={() => completeMut.mutate()}>Mark Complete</Button>}
        </div>

        {/* Comments */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Comments ({task.comments?.length || 0})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 180, overflowY: 'auto', marginBottom: 10 }}>
            {task.comments?.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments yet.</div>}
            {task.comments?.map(c => (
              <div key={c.id} style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{c.author?.full_name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.content}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." onKeyDown={e => e.key === 'Enter' && comment && commentMut.mutate(comment)} style={{ flex: 1, padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: '#fff' }} />
            <Button size="sm" icon={<MessageSquare size={13} />} loading={commentMut.isPending} onClick={() => comment && commentMut.mutate(comment)} disabled={!comment}>Post</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function OperationsPage() {
  const { canManageTasks } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, priorityFilter, statusFilter],
    queryFn: () => getTasks({ search: search || undefined, priority: priorityFilter || undefined, status: statusFilter || undefined }).then(r => r.data),
  });

  const tasks = (data?.results || []).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', background: '#fff' }} />
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Statuses</option>
          {Object.entries(TASK_STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        {canManageTasks() && <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Task</Button>}
      </div>

      {/* Kanban-style columns */}
      {isLoading ? <Loader /> : tasks.length === 0 ? (
        <EmptyState icon="📋" title="No tasks found" subtitle="All clear — no operation tasks match your filters." action={canManageTasks() && <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Create First Task</Button>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {tasks.map((task) => {
            const pmeta = PRIORITY_META[task.priority] || {};
            const smeta = TASK_STATUS_META[task.status] || {};
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
            return (
              <Card key={task.id} onClick={() => setSelectedTask(task)} style={{ padding: 16, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', opacity: task.status === 'cancelled' ? 0.6 : 1 }}
                className="animate-slide-in"
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <Badge {...pmeta} />
                  <Badge {...smeta} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
                {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border-soft)' }}>
                  <div style={{ fontSize: 11, color: isOverdue ? 'var(--red)' : 'var(--text-muted)', fontWeight: isOverdue ? 600 : 400 }}>
                    {task.due_date ? (isOverdue ? '⚠ Overdue · ' : '') + formatDate(task.due_date) : timeAgo(task.created_at)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                    <MessageSquare size={11} />
                    {task.comments?.length || 0}
                  </div>
                </div>
                {task.assigned_to && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>
                      {task.assigned_to.first_name?.[0]}{task.assigned_to.last_name?.[0]}
                    </div>
                    {task.assigned_to.full_name}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => qc.invalidateQueries(['tasks'])} />
      <TaskDetailModal task={selectedTask} open={!!selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
