import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (d) => d ? format(new Date(d), 'MMM d, yyyy') : '—';
export const formatDateTime = (d) => d ? format(new Date(d), 'MMM d, yyyy · h:mm a') : '—';
export const timeAgo = (d) => d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—';

export const STATUS_META = {
  draft:        { label: 'Draft',        color: '#8892a4', bg: 'var(--surface-3)' },
  pending:      { label: 'Pending',      color: '#d97706', bg: '#fef3c7' },
  under_review: { label: 'Under Review', color: '#2563eb', bg: '#dbeafe' },
  more_info:    { label: 'More Info',    color: '#ea580c', bg: '#ffedd5' },
  approved:     { label: 'Approved',     color: '#059669', bg: '#d1fae5' },
  rejected:     { label: 'Rejected',     color: '#dc2626', bg: '#fee2e2' },
};

export const PRIORITY_META = {
  low:    { label: 'Low',    color: '#8892a4', bg: 'var(--surface-3)' },
  medium: { label: 'Medium', color: '#2563eb', bg: '#dbeafe' },
  high:   { label: 'High',   color: '#d97706', bg: '#fef3c7' },
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fee2e2' },
};

export const TASK_STATUS_META = {
  open:        { label: 'Open',        color: '#2563eb', bg: '#dbeafe' },
  in_progress: { label: 'In Progress', color: '#d97706', bg: '#fef3c7' },
  on_hold:     { label: 'On Hold',     color: '#8892a4', bg: 'var(--surface-3)' },
  done:        { label: 'Done',        color: '#059669', bg: '#d1fae5' },
  cancelled:   { label: 'Cancelled',   color: '#dc2626', bg: '#fee2e2' },
};

export const COVERAGE_LABELS = {
  life: 'Life', health: 'Health', auto: 'Auto',
  property: 'Property', liability: 'Liability', commercial: 'Commercial',
};

export const formatCurrency = (n) =>
  n != null ? new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n) : '—';

export const getErrorMessage = (err) =>
  err?.response?.data?.detail ||
  Object.values(err?.response?.data || {})?.[0]?.[0] ||
  err?.message || 'Something went wrong';
