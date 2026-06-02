import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, Trash2, Download, Paperclip } from 'lucide-react';
import { uploadDocument, listDocuments, deleteDocument } from '../../api/policies';
import { Button } from '../common/Button';
import { Loader } from '../common/Loader';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const FILE_ICONS = {
  'application/pdf':  { color: '#dc2626', label: 'PDF' },
  'image/jpeg':       { color: '#2563eb', label: 'IMG' },
  'image/png':        { color: '#2563eb', label: 'IMG' },
  'application/msword': { color: '#1d4ed8', label: 'DOC' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: '#1d4ed8', label: 'DOC' },
};

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUpload({ policyId }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['policy-docs', policyId],
    queryFn: () => listDocuments(policyId).then(r => r.data),
  });

  const uploadMut = useMutation({
    mutationFn: ({ file, name }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name || file.name);
      return uploadDocument(policyId, fd);
    },
    onSuccess: () => {
      toast.success('Document uploaded!');
      qc.invalidateQueries(['policy-docs', policyId]);
      setPendingFile(null);
      setUploadName('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (docId) => deleteDocument(policyId, docId),
    onSuccess: () => { toast.success('Document removed.'); qc.invalidateQueries(['policy-docs', policyId]); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setPendingFile(file); setUploadName(file.name); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setPendingFile(file); setUploadName(file.name); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !pendingFile && inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--ink)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          textAlign: 'center',
          cursor: pendingFile ? 'default' : 'pointer',
          background: dragging ? 'var(--surface-2)' : 'var(--surface)',
          transition: 'all 0.15s',
        }}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" />

        {pendingFile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', maxWidth: 380 }}>
              <FileText size={18} color="var(--blue)" />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatBytes(pendingFile.size)}</div>
              </div>
            </div>
            <input
              value={uploadName}
              onChange={e => setUploadName(e.target.value)}
              placeholder="Document label (optional)"
              style={{ width: '100%', maxWidth: 380, padding: '7px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', background: '#fff' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => { setPendingFile(null); setUploadName(''); }}>Cancel</Button>
              <Button size="sm" icon={<Upload size={13} />} loading={uploadMut.isPending} onClick={() => uploadMut.mutate({ file: pendingFile, name: uploadName })}>Upload</Button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <Paperclip size={20} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
              Drop a file here or <span style={{ color: 'var(--ink)', textDecoration: 'underline' }}>browse</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF, DOC, JPG, PNG, XLS — max 10 MB</div>
          </>
        )}
      </div>

      {/* Uploaded docs list */}
      {isLoading ? <Loader size={20} /> : docs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
            Attached Files ({docs.length})
          </div>
          {docs.map((doc) => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={15} color="var(--blue)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {doc.uploaded_by?.full_name} · {formatDate(doc.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <a href={`http://localhost:8000${doc.file}`} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="sm" icon={<Download size={13} />}>View</Button>
                </a>
                {(doc.uploaded_by?.id === user?.id || user?.role === 'admin') && (
                  <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} style={{ color: 'var(--red)' }}
                    loading={deleteMut.isPending} onClick={() => deleteMut.mutate(doc.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
