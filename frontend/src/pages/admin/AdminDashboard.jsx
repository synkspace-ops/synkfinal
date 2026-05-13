import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Ban,
  Building2,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Globe2,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import logo from '../../../assets/synkspace-logo.png';
import { apiGet, apiPost, apiPut } from '../../lib/api';
import { clearAuthSession } from '../../lib/auth';

const roleColors = ['#0f172a', '#2563eb', '#0891b2', '#f59e0b'];
const statusColors = {
  Pending: '#f59e0b',
  Verified: '#10b981',
  Suspended: '#ef4444',
};

const navItems = [
  { id: 'overview', icon: BarChart3, label: 'Overview', description: 'Live platform metrics, traffic, registrations, and recent activity' },
  { id: 'registrations', icon: Users, label: 'Registrations', description: 'Review creator, brand, and event organiser profiles from onboarding' },
  { id: 'campaigns', icon: Megaphone, label: 'Campaigns', description: 'Monitor campaigns, slots, budgets, and campaign status' },
  { id: 'applications', icon: ClipboardList, label: 'Applications', description: 'Track creator applications, proposals, and acceptance status' },
  { id: 'user-management', icon: UserCog, label: 'User Management', description: 'Manage users, profile details, access status, and login history' },
  { id: 'traffic', icon: Globe2, label: 'Traffic', description: 'Monthly traffic totals and active visitor calendar' },
  { id: 'messages', icon: MessageSquare, label: 'Messages', description: 'Site Admin inbox and user conversations' },
  { id: 'audit', icon: ShieldCheck, label: 'Audit', description: 'Verification, account status, team invites, and marketplace health' },
];

const registrationRoles = [
  { id: 'CREATOR', label: 'Content Creators', countKey: 'creators' },
  { id: 'BRAND', label: 'Brands', countKey: 'brands' },
  { id: 'ORGANISER', label: 'Event Organisers', countKey: 'organisers' },
];

const userRoles = [
  { id: '', label: 'All roles' },
  { id: 'CREATOR', label: 'Creators' },
  { id: 'BRAND', label: 'Brands' },
  { id: 'ORGANISER', label: 'Event Organisers' },
];

const accountStatuses = [
  { id: '', label: 'All statuses' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'VERIFIED', label: 'Active' },
  { id: 'SUSPENDED', label: 'Blocked' },
];

const campaignStatuses = [
  { id: '', label: 'All campaigns' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'CLOSED', label: 'Closed' },
  { id: 'COMPLETED', label: 'Completed' },
];

const applicationStatuses = [
  { id: '', label: 'All applications' },
  { id: 'APPLIED', label: 'Applied' },
  { id: 'SHORTLISTED', label: 'Shortlisted' },
  { id: 'ACCEPTED', label: 'Accepted' },
  { id: 'REJECTED', label: 'Rejected' },
];

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return 'Not available';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatValue(value) {
  if (value === null || typeof value === 'undefined' || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'Not provided';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDate(value);
  return String(value);
}

function prettyLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileSubtitle(item) {
  const profile = item?.profile || {};
  if (item?.role === 'CREATOR') return [profile.niche, profile.city || profile.state, profile.followerRange].filter(Boolean).join(' • ');
  if (item?.role === 'BRAND') return [profile.industry, profile.location, profile.companySize].filter(Boolean).join(' • ');
  return [profile.eventType, profile.city || profile.state, profile.footfall].filter(Boolean).join(' • ');
}

function accountStatusLabel(status) {
  if (status === 'VERIFIED') return 'Active';
  if (status === 'SUSPENDED') return 'Blocked';
  return 'Pending';
}

function statusBadgeClass(status) {
  if (['ACTIVE', 'VERIFIED', 'ACCEPTED', true].includes(status)) return 'bg-emerald-50 text-emerald-700';
  if (['SUSPENDED', 'BLOCKED', 'REJECTED', false].includes(status)) return 'bg-red-50 text-red-700';
  if (['DRAFT', 'PENDING', 'APPLIED', 'SHORTLISTED'].includes(status)) return 'bg-amber-50 text-amber-700';
  if (['CLOSED', 'COMPLETED'].includes(status)) return 'bg-blue-50 text-blue-700';
  return 'bg-slate-100 text-slate-700';
}

function StatusBadge({ status, label }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase ${statusBadgeClass(status)}`}>
      {label || accountStatusLabel(status) || status}
    </span>
  );
}

function SelectControl({ value, onChange, options, ariaLabel }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-slate-950"
    >
      {options.map((option) => (
        <option key={option.id || 'all'} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function shadeHex(hex, amount) {
  const clean = String(hex || '#64748b').replace('#', '');
  const value = Number.parseInt(clean.length === 3 ? clean.split('').map((item) => item + item).join('') : clean, 16);
  if (Number.isNaN(value)) return hex;
  const clamp = (channel) => Math.max(0, Math.min(255, channel + amount));
  const red = clamp((value >> 16) & 255);
  const green = clamp((value >> 8) & 255);
  const blue = clamp(value & 255);
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function ThreeDBar({ x = 0, y = 0, width = 0, height = 0, fill = '#2563eb' }) {
  if (!height || height < 1 || width < 1) return null;
  const depth = Math.min(8, Math.max(4, width * 0.25));
  const top = Math.max(0, y - depth);
  const sideColor = shadeHex(fill, -36);
  const topColor = shadeHex(fill, 34);

  return (
    <g>
      <path d={`M ${x} ${y} L ${x + depth} ${top} L ${x + width + depth} ${top} L ${x + width} ${y} Z`} fill={topColor} />
      <path d={`M ${x + width} ${y} L ${x + width + depth} ${top} L ${x + width + depth} ${y + height - depth} L ${x + width} ${y + height} Z`} fill={sideColor} />
      <rect x={x} y={y} width={width} height={height} rx={6} fill={fill} />
    </g>
  );
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
          {hint ? <p className="mt-1 text-sm font-medium text-slate-500">{hint}</p> : null}
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex h-full min-h-56 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm font-semibold text-slate-500">
      {label}
    </div>
  );
}

function DetailGrid({ data }) {
  const entries = Object.entries(data || {}).filter(([, value]) => value !== null && typeof value !== 'undefined' && value !== '');
  if (!entries.length) return <EmptyState label="No profile details saved yet." />;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{prettyLabel(key)}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-bold text-slate-800">{formatValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ProfileDetailsDrawer({ detail, loading, error, onClose, onUpdateUserStatus, onOpenMessage, statusUpdating }) {
  if (!detail && !loading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Registration Profile</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{detail?.name || 'Loading profile'}</h2>
            {detail?.email ? <p className="mt-1 truncate text-sm font-semibold text-slate-500">{detail.email}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Close profile details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading full profile
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{error}</div>
          ) : (
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-xl font-black text-white">
                    {detail.avatarUrl ? <img src={detail.avatarUrl} alt={detail.name} className="h-full w-full object-cover" /> : detail.name?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xl font-black text-slate-950">{detail.name}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{detail.email}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black uppercase text-white">{detail.role}</span>
                      <StatusBadge status={detail.status} />
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                        {detail.emailVerified ? 'Email verified' : 'Email pending'}
                      </span>
                    </div>
                    {onUpdateUserStatus ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {detail.status !== 'VERIFIED' ? (
                          <button
                            type="button"
                            disabled={statusUpdating}
                            onClick={() => onUpdateUserStatus(detail.id, 'VERIFIED')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Set active
                          </button>
                        ) : null}
                        {detail.status !== 'SUSPENDED' ? (
                          <button
                            type="button"
                            disabled={statusUpdating || detail.role === 'ADMIN'}
                            onClick={() => onUpdateUserStatus(detail.id, 'SUSPENDED')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
                          >
                            <Ban className="h-4 w-4" />
                            Block user
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={statusUpdating}
                            onClick={() => onUpdateUserStatus(detail.id, 'VERIFIED')}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Restore access
                          </button>
                        )}
                        {onOpenMessage && detail.role !== 'ADMIN' ? (
                          <button
                            type="button"
                            disabled={statusUpdating}
                            onClick={() => onOpenMessage(detail)}
                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" />
                            Message
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>

              <Panel title="Account Details" subtitle="Core account and activity counts">
                <DetailGrid
                  data={{
                    userId: detail.id,
                    email: detail.email,
                    role: detail.role,
                    status: detail.status,
                    currentStatus: detail.currentStatus || accountStatusLabel(detail.status),
                    emailVerified: detail.emailVerified,
                    registeredAt: detail.createdAt,
                    updatedAt: detail.updatedAt,
                    applications: detail.counts?.applications,
                    campaigns: detail.counts?.campaignsAsBrand,
                    messagesSent: detail.counts?.messagesSent,
                    messagesReceived: detail.counts?.messagesReceived,
                    teamMembers: detail.counts?.ownedTeamMembers,
                    notifications: detail.counts?.notifications,
                    loginEvents: detail.counts?.loginEvents,
                  }}
                />
              </Panel>

              <Panel title="Full Profile Details" subtitle="All saved onboarding profile fields for this account">
                <DetailGrid data={detail.profile} />
              </Panel>

              {detail.onboardingProgress ? (
                <Panel title="Onboarding Progress" subtitle="Saved onboarding data and completion state">
                  <DetailGrid data={detail.onboardingProgress} />
                </Panel>
              ) : null}

              <Panel title="Login History" subtitle="Recent sign-in attempts captured for audit">
                {detail.loginHistory?.length ? (
                  <div className="space-y-3">
                    {detail.loginHistory.map((event) => (
                      <div key={event.id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={event.success} label={event.success ? 'Success' : 'Failed'} />
                              {event.failureReason ? <span className="text-xs font-black uppercase text-slate-400">{event.failureReason}</span> : null}
                            </div>
                            <p className="mt-2 break-words text-xs font-semibold text-slate-500">{event.userAgent || 'No user agent recorded'}</p>
                            {event.ip ? <p className="mt-1 text-xs font-bold text-slate-400">IP {event.ip}</p> : null}
                          </div>
                          <p className="shrink-0 text-xs font-bold text-slate-500">{formatDate(event.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No login attempts recorded yet." />
                )}
              </Panel>

              {detail.campaigns?.length ? (
                <Panel title="Campaigns" subtitle="Campaigns created by this brand or organiser">
                  <div className="space-y-3">
                    {detail.campaigns.map((campaign) => (
                      <div key={campaign.id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{campaign.title}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{campaign.category} • {campaign.location}</p>
                          </div>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{campaign.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}

              {detail.applications?.length ? (
                <Panel title="Applications" subtitle="Recent campaign applications from this creator">
                  <div className="space-y-3">
                    {detail.applications.map((application) => (
                      <div key={application.id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">{application.campaign?.title || 'Campaign'}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{application.campaign?.category} • {formatCurrency(application.proposedRate)}</p>
                          </div>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">{application.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}

              {detail.ownedTeamMembers?.length ? (
                <Panel title="Team Members" subtitle="Invited and active team members">
                  <div className="space-y-3">
                    {detail.ownedTeamMembers.map((member) => (
                      <div key={member.id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="text-sm font-black text-slate-950">{member.name}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{member.designation} • {member.email} • {member.status}</p>
                      </div>
                    ))}
                  </div>
                </Panel>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EntityDetailsDrawer({ title, subtitle, loading, error, onClose, children }) {
  if (!title && !loading && !error) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
      <div className="ml-auto flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Admin Details</p>
            <h2 className="mt-1 truncate text-2xl font-black text-slate-950">{title || 'Loading details'}</h2>
            {subtitle ? <p className="mt-1 truncate text-sm font-semibold text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
              Loading details
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">{error}</div>
          ) : (
            <div className="space-y-5">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminMessageDialog({ user, body, error, sending, onBodyChange, onClose, onSubmit }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Send as Site Admin</p>
            <h2 className="mt-1 truncate text-xl font-black text-slate-950">{user.name}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
            aria-label="Close message form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mt-5 block text-sm font-black text-slate-700" htmlFor="site-admin-message">
          Message
        </label>
        <textarea
          id="site-admin-message"
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          rows={6}
          placeholder="Type the message this user should receive..."
          className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-950"
        />
        {error ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sending' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [error, setError] = useState('');
  const [registrationRole, setRegistrationRole] = useState('CREATOR');
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [registrations, setRegistrations] = useState({ items: [], total: 0, page: 1, limit: 25 });
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationsError, setRegistrationsError] = useState('');
  const [profileDetail, setProfileDetail] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [campaigns, setCampaigns] = useState({ items: [], total: 0, page: 1, limit: 25 });
  const [campaignStatus, setCampaignStatus] = useState('ACTIVE');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [submittedCampaignSearch, setSubmittedCampaignSearch] = useState('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false);
  const [campaignDetailError, setCampaignDetailError] = useState('');
  const [applications, setApplications] = useState({ items: [], total: 0, page: 1, limit: 25 });
  const [applicationStatus, setApplicationStatus] = useState('');
  const [applicationSearch, setApplicationSearch] = useState('');
  const [submittedApplicationSearch, setSubmittedApplicationSearch] = useState('');
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationDetailLoading, setApplicationDetailLoading] = useState(false);
  const [applicationDetailError, setApplicationDetailError] = useState('');
  const [managedUsers, setManagedUsers] = useState({ items: [], total: 0, page: 1, limit: 25 });
  const [managedRole, setManagedRole] = useState('');
  const [managedStatus, setManagedStatus] = useState('');
  const [managedSearch, setManagedSearch] = useState('');
  const [submittedManagedSearch, setSubmittedManagedSearch] = useState('');
  const [managedUsersLoading, setManagedUsersLoading] = useState(false);
  const [managedUsersError, setManagedUsersError] = useState('');
  const [messageUser, setMessageUser] = useState(null);
  const [adminMessageBody, setAdminMessageBody] = useState('');
  const [adminMessageError, setAdminMessageError] = useState('');
  const [adminMessageSending, setAdminMessageSending] = useState(false);
  const [adminConversations, setAdminConversations] = useState({ items: [], total: 0 });
  const [adminConversationsLoading, setAdminConversationsLoading] = useState(false);
  const [adminConversationsError, setAdminConversationsError] = useState('');
  const [activeAdminConversationId, setActiveAdminConversationId] = useState('');
  const [adminChatBody, setAdminChatBody] = useState('');
  const [adminChatSending, setAdminChatSending] = useState(false);

  const loadOverview = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await apiGet('/api/admin/overview');
      setOverview(response?.data || null);
      setLastRefreshedAt(new Date().toISOString());
    } catch (overviewError) {
      setError(overviewError?.message || 'Could not load admin dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRegistrations = async () => {
    setRegistrationsLoading(true);
    setRegistrationsError('');
    try {
      const params = new URLSearchParams({
        role: registrationRole,
        page: String(registrations.page || 1),
        limit: String(registrations.limit || 25),
      });
      if (submittedSearch.trim()) params.set('search', submittedSearch.trim());
      const response = await apiGet(`/api/admin/registrations?${params.toString()}`);
      setRegistrations(response?.data || { items: [], total: 0, page: 1, limit: 25 });
    } catch (registrationError) {
      setRegistrationsError(registrationError?.message || 'Could not load registrations.');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const openProfileDetails = async (userId, source = 'registrations') => {
    setProfileDetail(null);
    setProfileError('');
    setProfileLoading(true);
    try {
      const endpoint = source === 'user-management' ? `/api/admin/user-management/${userId}` : `/api/admin/registrations/${userId}`;
      const response = await apiGet(endpoint);
      setProfileDetail(response?.data || null);
    } catch (detailsError) {
      setProfileError(detailsError?.message || 'Could not load profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  const loadCampaigns = async () => {
    setCampaignsLoading(true);
    setCampaignsError('');
    try {
      const params = new URLSearchParams({
        page: String(campaigns.page || 1),
        limit: String(campaigns.limit || 25),
      });
      if (campaignStatus) params.set('status', campaignStatus);
      if (submittedCampaignSearch.trim()) params.set('search', submittedCampaignSearch.trim());
      const response = await apiGet(`/api/admin/campaigns?${params.toString()}`);
      setCampaigns(response?.data || { items: [], total: 0, page: 1, limit: 25 });
    } catch (campaignError) {
      setCampaignsError(campaignError?.message || 'Could not load campaigns.');
    } finally {
      setCampaignsLoading(false);
    }
  };

  const openCampaignDetails = async (campaignId) => {
    setSelectedCampaign(null);
    setCampaignDetailError('');
    setCampaignDetailLoading(true);
    try {
      const response = await apiGet(`/api/admin/campaigns/${campaignId}`);
      setSelectedCampaign(response?.data || null);
    } catch (campaignError) {
      setCampaignDetailError(campaignError?.message || 'Could not load campaign details.');
    } finally {
      setCampaignDetailLoading(false);
    }
  };

  const updateCampaignStatus = async (campaignId, status) => {
    setStatusUpdating(true);
    try {
      const response = await apiPut(`/api/admin/campaigns/${campaignId}/status`, { status });
      const updated = response?.data;
      if (updated) {
        setCampaigns((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) }));
        setSelectedCampaign((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      }
      await loadOverview({ silent: true });
    } catch (campaignError) {
      setCampaignsError(campaignError?.message || 'Could not update campaign status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const loadApplications = async () => {
    setApplicationsLoading(true);
    setApplicationsError('');
    try {
      const params = new URLSearchParams({
        page: String(applications.page || 1),
        limit: String(applications.limit || 25),
      });
      if (applicationStatus) params.set('status', applicationStatus);
      if (submittedApplicationSearch.trim()) params.set('search', submittedApplicationSearch.trim());
      const response = await apiGet(`/api/admin/applications?${params.toString()}`);
      setApplications(response?.data || { items: [], total: 0, page: 1, limit: 25 });
    } catch (applicationError) {
      setApplicationsError(applicationError?.message || 'Could not load applications.');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const openApplicationDetails = async (applicationId) => {
    setSelectedApplication(null);
    setApplicationDetailError('');
    setApplicationDetailLoading(true);
    try {
      const response = await apiGet(`/api/admin/applications/${applicationId}`);
      setSelectedApplication(response?.data || null);
    } catch (applicationError) {
      setApplicationDetailError(applicationError?.message || 'Could not load application details.');
    } finally {
      setApplicationDetailLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId, status) => {
    setStatusUpdating(true);
    try {
      const response = await apiPut(`/api/admin/applications/${applicationId}/status`, { status });
      const updated = response?.data;
      if (updated) {
        setApplications((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) }));
        setSelectedApplication((prev) => (prev?.id === updated.id ? updated : prev));
      }
      await Promise.all([loadOverview({ silent: true }), loadCampaigns()]);
    } catch (applicationError) {
      setApplicationsError(applicationError?.message || 'Could not update application status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const loadManagedUsers = async () => {
    setManagedUsersLoading(true);
    setManagedUsersError('');
    try {
      const params = new URLSearchParams({
        page: String(managedUsers.page || 1),
        limit: String(managedUsers.limit || 25),
      });
      if (managedRole) params.set('role', managedRole);
      if (managedStatus) params.set('status', managedStatus);
      if (submittedManagedSearch.trim()) params.set('search', submittedManagedSearch.trim());
      const response = await apiGet(`/api/admin/user-management?${params.toString()}`);
      setManagedUsers(response?.data || { items: [], total: 0, page: 1, limit: 25 });
    } catch (managedError) {
      setManagedUsersError(managedError?.message || 'Could not load users.');
    } finally {
      setManagedUsersLoading(false);
    }
  };

  const updateUserStatus = async (userId, status) => {
    setStatusUpdating(true);
    setProfileError('');
    setManagedUsersError('');
    try {
      const response = await apiPut(`/api/admin/user-management/${userId}/status`, { status });
      const updated = response?.data;
      if (updated) {
        setManagedUsers((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) }));
        setRegistrations((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === updated.id ? updated : item)) }));
        setProfileDetail((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      }
      await loadOverview({ silent: true });
    } catch (statusError) {
      const message = statusError?.message || 'Could not update user status.';
      setManagedUsersError(message);
      setProfileError(message);
    } finally {
      setStatusUpdating(false);
    }
  };

  const upsertAdminConversation = (conversation) => {
    if (!conversation?.id) return;
    setAdminConversations((prev) => {
      const nextItems = [conversation, ...prev.items.filter((item) => item.id !== conversation.id)]
        .sort((first, second) => String(second.updatedAt || '').localeCompare(String(first.updatedAt || '')));
      return { items: nextItems, total: nextItems.length };
    });
    setActiveAdminConversationId(conversation.id);
  };

  const loadAdminConversations = async () => {
    setAdminConversationsLoading(true);
    setAdminConversationsError('');
    try {
      const response = await apiGet('/api/admin/messages/conversations');
      const data = response?.data || { items: [], total: 0 };
      setAdminConversations(data);
      setActiveAdminConversationId((current) => {
        if (current && data.items.some((item) => item.id === current)) return current;
        return data.items[0]?.id || '';
      });
    } catch (conversationError) {
      setAdminConversationsError(conversationError?.message || 'Could not load admin conversations.');
    } finally {
      setAdminConversationsLoading(false);
    }
  };

  const openAdminConversation = async (conversationId) => {
    setActiveAdminConversationId(conversationId);
    setAdminConversationsError('');
    try {
      const response = await apiGet(`/api/admin/messages/conversations/${conversationId}`);
      upsertAdminConversation(response?.data);
    } catch (conversationError) {
      setAdminConversationsError(conversationError?.message || 'Could not load conversation.');
    }
  };

  const openAdminMessage = (user) => {
    setMessageUser(user);
    setAdminMessageBody('');
    setAdminMessageError('');
  };

  const closeAdminMessage = () => {
    setMessageUser(null);
    setAdminMessageBody('');
    setAdminMessageError('');
  };

  const sendAdminMessage = async (event) => {
    event.preventDefault();
    if (!messageUser || !adminMessageBody.trim()) return;
    setAdminMessageSending(true);
    setAdminMessageError('');
    try {
      await apiPost(`/api/admin/user-management/${messageUser.id}/message`, { body: adminMessageBody.trim() });
      closeAdminMessage();
      await Promise.all([loadOverview({ silent: true }), loadAdminConversations()]);
    } catch (messageError) {
      setAdminMessageError(messageError?.message || 'Could not send message.');
    } finally {
      setAdminMessageSending(false);
    }
  };

  const sendAdminChatMessage = async (event) => {
    event.preventDefault();
    if (!activeAdminConversationId || !adminChatBody.trim()) return;
    setAdminChatSending(true);
    setAdminConversationsError('');
    try {
      const response = await apiPost(`/api/admin/messages/conversations/${activeAdminConversationId}`, { body: adminChatBody.trim() });
      upsertAdminConversation(response?.data);
      setAdminChatBody('');
      await loadOverview({ silent: true });
    } catch (messageError) {
      setAdminConversationsError(messageError?.message || 'Could not send message.');
    } finally {
      setAdminChatSending(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeSection === 'registrations') loadRegistrations();
  }, [activeSection, registrationRole, registrations.page, submittedSearch]);

  useEffect(() => {
    if (activeSection === 'campaigns') loadCampaigns();
  }, [activeSection, campaignStatus, campaigns.page, submittedCampaignSearch]);

  useEffect(() => {
    if (activeSection === 'applications') loadApplications();
  }, [activeSection, applicationStatus, applications.page, submittedApplicationSearch]);

  useEffect(() => {
    if (activeSection === 'user-management') loadManagedUsers();
  }, [activeSection, managedRole, managedStatus, managedUsers.page, submittedManagedSearch]);

  useEffect(() => {
    if (activeSection === 'messages') loadAdminConversations();
  }, [activeSection]);

  const totals = overview?.totals || {};
  const activeNav = navItems.find((item) => item.id === activeSection) || navItems[0];
  const headerUpdatedAt = lastRefreshedAt || overview?.generatedAt;
  const roleBreakdown = useMemo(
    () => (overview?.roleBreakdown || []).filter((item) => Number(item.value || 0) > 0),
    [overview]
  );
  const monthlyTrafficData = useMemo(() => overview?.monthly || [], [overview]);
  const activeTrafficDays = useMemo(
    () => (overview?.daily || []).filter((row) => Number(row.visits || 0) > 0 || Number(row.registrations || 0) > 0),
    [overview]
  );
  const statusBreakdown = overview?.statusBreakdown || [];
  const hasTrafficData = monthlyTrafficData.some((row) => Number(row.visits || 0) > 0 || Number(row.registrations || 0) > 0);
  const messageActivities = (overview?.recentActivity || []).filter((activity) => activity.type === 'Message');
  const activeAdminConversation = adminConversations.items.find((conversation) => conversation.id === activeAdminConversationId) || null;

  const handleLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  const changeRegistrationRole = (role) => {
    setRegistrationRole(role);
    setRegistrations((prev) => ({ ...prev, page: 1 }));
  };

  const handleRegistrationSearch = (event) => {
    event.preventDefault();
    setRegistrations((prev) => ({ ...prev, page: 1 }));
    setSubmittedSearch(registrationSearch);
  };

  const handleCampaignSearch = (event) => {
    event.preventDefault();
    setCampaigns((prev) => ({ ...prev, page: 1 }));
    setSubmittedCampaignSearch(campaignSearch);
  };

  const handleApplicationSearch = (event) => {
    event.preventDefault();
    setApplications((prev) => ({ ...prev, page: 1 }));
    setSubmittedApplicationSearch(applicationSearch);
  };

  const handleManagedUserSearch = (event) => {
    event.preventDefault();
    setManagedUsers((prev) => ({ ...prev, page: 1 }));
    setSubmittedManagedSearch(managedSearch);
  };

  const renderOverview = () => (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Eye} label="Traffic Today" value={formatNumber(totals.trafficToday)} hint={`${formatNumber(totals.trafficLast7)} visits in 7 days`} />
        <StatCard icon={UserPlus} label="New Users Today" value={formatNumber(totals.usersToday)} hint={`${formatNumber(totals.users)} total registered users`} />
        <StatCard icon={Users} label="Creators" value={formatNumber(totals.creators)} hint={`${formatNumber(totals.creatorProfiles)} completed profiles`} />
        <StatCard icon={Building2} label="Brands" value={formatNumber(totals.brands)} hint={`${formatNumber(totals.brandProfiles)} completed profiles`} />
        <StatCard icon={CalendarDays} label="Event Organisers" value={formatNumber(totals.organisers)} hint={`${formatNumber(totals.organiserProfiles)} completed profiles`} />
        <StatCard icon={Megaphone} label="Campaigns" value={formatNumber(totals.campaigns)} hint={`${formatNumber(totals.activeCampaigns)} active campaigns`} />
        <StatCard icon={MessageSquare} label="Messages" value={formatNumber(totals.messages)} hint={`${formatNumber(totals.directMessages)} direct messages`} />
        <StatCard icon={Wallet} label="Escrow Value" value={formatCurrency(totals.escrowValue)} hint={`${formatNumber(totals.escrowRecords)} escrow records`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">
        {renderTrafficChart()}
        {renderRoleSplit()}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {renderStatusChart()}
        {renderMarketplaceHealth()}
        {renderTopPages()}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {renderRecentUsers()}
        {renderRecentActivity()}
      </section>
    </>
  );

  const renderTrafficChart = () => (
    <Panel title="Traffic and Registrations" subtitle="Monthly totals with active daily dates listed below">
      <div className="h-72">
        {hasTrafficData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTrafficData} margin={{ top: 18, right: 18, left: -18, bottom: 10 }} barCategoryGap="32%">
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                interval={0}
                minTickGap={18}
                height={34}
                tickMargin={10}
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visits" name="Page views" fill="#2563eb" shape={<ThreeDBar />} maxBarSize={30} />
              <Bar dataKey="registrations" name="Registrations" fill="#10b981" shape={<ThreeDBar />} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="Traffic will appear here as visitors use the website." />
        )}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">Daily Activity Calendar</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">Days in the last 30 days with visits or registrations</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-600">
            {formatNumber(activeTrafficDays.length)} active days
          </span>
        </div>
        {activeTrafficDays.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {activeTrafficDays.map((day) => {
              const date = new Date(`${day.date}T00:00:00`);
              const month = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date);
              const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date);
              const dayNumber = new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(date);
              return (
                <div key={day.date} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="w-16 overflow-hidden rounded-xl border border-slate-200 bg-white text-center shadow-sm">
                    <p className="bg-slate-950 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">{month}</p>
                    <p className="py-2 text-2xl font-black leading-none text-slate-950">{dayNumber}</p>
                    <p className="pb-2 text-[10px] font-black uppercase text-slate-400">{weekday}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{day.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{formatNumber(day.visits)} visits</span>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{formatNumber(day.registrations)} registrations</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState label="No visitor or registration days in the last 30 days." />
          </div>
        )}
      </div>
    </Panel>
  );

  const renderRoleSplit = () => (
    <Panel title="Registered User Split" subtitle={`${formatNumber(totals.uniqueVisitorsLast7)} unique visitors in the last 7 days`}>
      <div className="h-80">
        {roleBreakdown.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={roleBreakdown} dataKey="value" nameKey="name" innerRadius={62} outerRadius={104} paddingAngle={3}>
                {roleBreakdown.map((entry, index) => (
                  <Cell key={entry.name} fill={roleColors[index % roleColors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="No registered users yet." />
        )}
      </div>
      <div className="grid gap-2">
        {(overview?.roleBreakdown || []).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: roleColors[index % roleColors.length] }} />
              {item.name}
            </span>
            <span className="text-slate-950">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );

  const renderStatusChart = () => (
    <Panel title="Account Status" subtitle="Verification health across all registered users">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusBreakdown} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {statusBreakdown.map((entry) => (
                <Cell key={entry.name} fill={statusColors[entry.name] || '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );

  const renderMarketplaceHealth = () => (
    <Panel title="Marketplace Health" subtitle="Campaign and application activity">
      <div className="grid gap-3">
        {[
          { icon: Megaphone, label: 'Campaigns', value: totals.campaigns },
          { icon: Activity, label: 'Active campaigns', value: totals.activeCampaigns },
          { icon: UserCheck, label: 'Applications', value: totals.applications },
          { icon: ShieldCheck, label: 'Accepted applications', value: totals.acceptedApplications },
          { icon: Users, label: 'Team members', value: totals.teamMembers },
          { icon: CalendarDays, label: 'Pending team invites', value: totals.pendingTeamMembers },
        ].map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
            <span className="flex items-center gap-3 text-sm font-bold text-slate-600">
              <item.icon className="h-4 w-4 text-slate-400" />
              {item.label}
            </span>
            <span className="text-lg font-black text-slate-950">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );

  const renderTopPages = () => (
    <Panel title="Top Pages" subtitle="Most visited routes in the last 7 days">
      <div className="space-y-3">
        {(overview?.topPaths || []).length ? (
          overview.topPaths.map((item) => (
            <div key={item.path} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-bold text-slate-700">{item.path}</p>
                <p className="text-sm font-black text-slate-950">{formatNumber(item.visits)}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState label="Page traffic will appear here." />
        )}
      </div>
    </Panel>
  );

  const renderRecentUsers = () => (
    <Panel title="Recent Registrations" subtitle="Latest users from the production database">
      <div className="space-y-3">
        {(overview?.recentUsers || []).length ? (
          overview.recentUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                if (!['CREATOR', 'BRAND', 'ORGANISER'].includes(user.role)) return;
                setActiveSection('registrations');
                changeRegistrationRole(user.role === 'ORGANISER' ? 'ORGANISER' : user.role === 'BRAND' ? 'BRAND' : 'CREATOR');
                openProfileDetails(user.id);
              }}
              className="flex w-full items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                <p className="truncate text-xs font-semibold text-slate-500">{user.email}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-black uppercase text-slate-700">{user.role}</p>
                <p className="text-xs font-semibold text-slate-400">{formatDate(user.createdAt)}</p>
              </div>
            </button>
          ))
        ) : (
          <EmptyState label="No users have registered yet." />
        )}
      </div>
    </Panel>
  );

  const renderRecentActivity = () => (
    <Panel title="Recent Activity" subtitle="Registrations, campaigns, applications, and messages">
      <div className="space-y-3">
        {(overview?.recentActivity || []).length ? (
          overview.recentActivity.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{item.type}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">{item.title}</p>
                </div>
                <p className="shrink-0 text-xs font-semibold text-slate-400">{formatDate(item.at)}</p>
              </div>
            </div>
          ))
        ) : (
          <EmptyState label="Activity will appear as users interact with the platform." />
        )}
      </div>
    </Panel>
  );

  const renderRegistrations = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {registrationRoles.map((role) => (
          <button
            type="button"
            key={role.id}
            onClick={() => changeRegistrationRole(role.id)}
            className={`rounded-2xl border p-5 text-left shadow-sm transition ${
              registrationRole === role.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-950 hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-black">{role.label}</p>
            <p className={`mt-3 text-3xl font-black ${registrationRole === role.id ? 'text-white' : 'text-slate-950'}`}>{formatNumber(totals[role.countKey])}</p>
            <p className={`mt-1 text-xs font-bold uppercase tracking-[0.14em] ${registrationRole === role.id ? 'text-slate-300' : 'text-slate-400'}`}>Registered</p>
          </button>
        ))}
      </section>

      <Panel
        title={`${registrationRoles.find((role) => role.id === registrationRole)?.label || 'Registrations'}`}
        subtitle={`${formatNumber(registrations.total)} matching accounts`}
        action={
          <form onSubmit={handleRegistrationSearch} className="flex w-full max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={registrationSearch}
                onChange={(event) => setRegistrationSearch(event.target.value)}
                placeholder="Search name, email, city"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-slate-950"
              />
            </div>
            <button type="submit" className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
              Search
            </button>
          </form>
        }
      >
        {registrationsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{registrationsError}</div>
        ) : registrationsLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading registrations
          </div>
        ) : registrations.items.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {registrations.items.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => openProfileDetails(item.id)}
                className="flex w-full items-center gap-4 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-black text-white">
                  {item.avatarUrl ? <img src={item.avatarUrl} alt={item.name} className="h-full w-full object-cover" /> : item.name?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase text-slate-600">{item.status}</span>
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.email}</p>
                  {profileSubtitle(item) ? <p className="mt-1 truncate text-xs font-semibold text-slate-400">{profileSubtitle(item)}</p> : null}
                </div>
                <div className="hidden shrink-0 text-right md:block">
                  <p className="text-xs font-black uppercase text-slate-500">Joined</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">{formatDate(item.createdAt)}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        ) : (
          <EmptyState label="No registrations found for this role." />
        )}
      </Panel>
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Megaphone} label="Campaigns" value={formatNumber(totals.campaigns)} hint={`${formatNumber(totals.activeCampaigns)} active`} />
        <StatCard icon={ClipboardList} label="Applications" value={formatNumber(totals.applications)} hint={`${formatNumber(totals.acceptedApplications)} accepted`} />
        <StatCard icon={Activity} label="Loaded Campaigns" value={formatNumber(campaigns.total)} hint="Matching current filters" />
      </section>

      <Panel
        title="Campaign Control"
        subtitle="Review active campaigns, audit details, and update lifecycle status"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SelectControl
              value={campaignStatus}
              onChange={(value) => {
                setCampaignStatus(value);
                setCampaigns((prev) => ({ ...prev, page: 1 }));
              }}
              options={campaignStatuses}
              ariaLabel="Campaign status filter"
            />
            <form onSubmit={handleCampaignSearch} className="flex w-full max-w-sm items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={campaignSearch}
                  onChange={(event) => setCampaignSearch(event.target.value)}
                  placeholder="Search campaigns"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-slate-950"
                />
              </div>
              <button type="submit" className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
                Search
              </button>
            </form>
          </div>
        }
      >
        {campaignsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{campaignsError}</div>
        ) : campaignsLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading campaigns
          </div>
        ) : campaigns.items.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {campaigns.items.map((campaign) => (
              <div key={campaign.id} className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:flex-row md:items-center">
                <button type="button" onClick={() => openCampaignDetails(campaign.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{campaign.title}</p>
                    <StatusBadge status={campaign.status} label={campaign.status} />
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {campaign.ownerName} • {campaign.category} • {campaign.location}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {formatCurrency(campaign.budgetMin)} - {formatCurrency(campaign.budgetMax)} • {formatNumber(campaign.applicationsCount)} applications • {campaign.filledSlots}/{campaign.totalSlots} slots
                  </p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <SelectControl
                    value={campaign.status}
                    onChange={(value) => updateCampaignStatus(campaign.id, value)}
                    options={campaignStatuses.filter((status) => status.id)}
                    ariaLabel={`Update ${campaign.title} status`}
                  />
                  <button
                    type="button"
                    onClick={() => openCampaignDetails(campaign.id)}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No campaigns found for this filter." />
        )}
      </Panel>
    </div>
  );

  const renderApplications = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={ClipboardList} label="Applications" value={formatNumber(totals.applications)} hint="Total creator applications" />
        <StatCard icon={CheckCircle2} label="Accepted" value={formatNumber(totals.acceptedApplications)} hint="Accepted applications" />
        <StatCard icon={Activity} label="Loaded Applications" value={formatNumber(applications.total)} hint="Matching current filters" />
      </section>

      <Panel
        title="Application Review"
        subtitle="Check proposals, campaign context, messages, contracts, and status"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <SelectControl
              value={applicationStatus}
              onChange={(value) => {
                setApplicationStatus(value);
                setApplications((prev) => ({ ...prev, page: 1 }));
              }}
              options={applicationStatuses}
              ariaLabel="Application status filter"
            />
            <form onSubmit={handleApplicationSearch} className="flex w-full max-w-sm items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={applicationSearch}
                  onChange={(event) => setApplicationSearch(event.target.value)}
                  placeholder="Search applications"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-slate-950"
                />
              </div>
              <button type="submit" className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
                Search
              </button>
            </form>
          </div>
        }
      >
        {applicationsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{applicationsError}</div>
        ) : applicationsLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading applications
          </div>
        ) : applications.items.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {applications.items.map((application) => (
              <div key={application.id} className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:flex-row md:items-center">
                <button type="button" onClick={() => openApplicationDetails(application.id)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-slate-950">{application.creatorName}</p>
                    <StatusBadge status={application.status} label={application.status} />
                  </div>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                    {application.campaign?.title || 'Campaign'} • {application.ownerName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {formatCurrency(application.proposedRate)} • {formatNumber(application.messagesCount)} messages • Applied {formatDate(application.appliedAt)}
                  </p>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <SelectControl
                    value={application.status}
                    onChange={(value) => updateApplicationStatus(application.id, value)}
                    options={applicationStatuses.filter((status) => status.id)}
                    ariaLabel={`Update application status for ${application.creatorName}`}
                  />
                  <button
                    type="button"
                    onClick={() => openApplicationDetails(application.id)}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No applications found for this filter." />
        )}
      </Panel>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Users} label="Registered Users" value={formatNumber(totals.users)} hint="All platform accounts" />
        <StatCard icon={CheckCircle2} label="Active Accounts" value={formatNumber(statusBreakdown.find((item) => item.name === 'Verified')?.value)} hint="Allowed to sign in" />
        <StatCard icon={Ban} label="Blocked Accounts" value={formatNumber(statusBreakdown.find((item) => item.name === 'Suspended')?.value)} hint="Prevented from sign-in and API access" />
      </section>

      <Panel
        title="User Management"
        subtitle={`${formatNumber(managedUsers.total)} users matching filters`}
        action={
          <div className="flex flex-col gap-2 xl:flex-row">
            <SelectControl
              value={managedRole}
              onChange={(value) => {
                setManagedRole(value);
                setManagedUsers((prev) => ({ ...prev, page: 1 }));
              }}
              options={userRoles}
              ariaLabel="User role filter"
            />
            <SelectControl
              value={managedStatus}
              onChange={(value) => {
                setManagedStatus(value);
                setManagedUsers((prev) => ({ ...prev, page: 1 }));
              }}
              options={accountStatuses}
              ariaLabel="User status filter"
            />
            <form onSubmit={handleManagedUserSearch} className="flex w-full max-w-sm items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={managedSearch}
                  onChange={(event) => setManagedSearch(event.target.value)}
                  placeholder="Search name, email, phone"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-semibold outline-none transition focus:border-slate-950"
                />
              </div>
              <button type="submit" className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800">
                Search
              </button>
            </form>
          </div>
        }
      >
        {managedUsersError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{managedUsersError}</div>
        ) : null}
        {managedUsersLoading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading users
          </div>
        ) : managedUsers.items.length ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {managedUsers.items.map((user) => (
              <div key={user.id} className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 last:border-b-0 md:flex-row md:items-center">
                <button type="button" onClick={() => openProfileDetails(user.id, 'user-management')} className="flex min-w-0 flex-1 items-center gap-4 text-left">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 text-sm font-black text-white">
                    {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" /> : user.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-slate-950">{user.name}</p>
                      <StatusBadge status={user.status} />
                    </div>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-500">{user.email}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{user.role} • {profileSubtitle(user) || 'Profile details available'}</p>
                  </div>
                </button>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateUserStatus(user.id, 'VERIFIED')}
                    disabled={statusUpdating || user.status === 'VERIFIED'}
                    className="h-10 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUserStatus(user.id, 'SUSPENDED')}
                    disabled={statusUpdating || user.status === 'SUSPENDED' || user.role === 'ADMIN'}
                    className="h-10 rounded-xl bg-red-600 px-4 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Block
                  </button>
                  <button
                    type="button"
                    onClick={() => openProfileDetails(user.id, 'user-management')}
                    className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => openAdminMessage(user)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                  >
                    <Send className="h-4 w-4" />
                    Message
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No users found for this filter." />
        )}
      </Panel>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={MessageSquare} label="Total Messages" value={formatNumber(totals.messages)} hint={`${formatNumber(totals.directMessages)} direct messages`} />
        <StatCard icon={Mail} label="Admin Chats" value={formatNumber(adminConversations.total)} hint="Conversations started by Site Admin" />
        <StatCard icon={Activity} label="Recent Message Events" value={formatNumber(messageActivities.length)} hint="From latest activity feed" />
      </section>

      <Panel
        title="Site Admin Inbox"
        subtitle="Chats with users who have received a message from Site Admin"
        action={
          <button
            type="button"
            onClick={loadAdminConversations}
            disabled={adminConversationsLoading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${adminConversationsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      >
        {adminConversationsError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{adminConversationsError}</div>
        ) : null}
        {adminConversationsLoading ? (
          <div className="flex min-h-96 items-center justify-center gap-3 text-sm font-bold text-slate-500">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading admin chats
          </div>
        ) : adminConversations.items.length ? (
          <div className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[340px_minmax(0,1fr)]">
            <div className="border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r">
              <div className="border-b border-slate-200 px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Conversations</p>
              </div>
              <div className="max-h-[560px] overflow-y-auto">
                {adminConversations.items.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => openAdminConversation(conversation.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-200 px-4 py-4 text-left transition last:border-b-0 ${
                      activeAdminConversationId === conversation.id ? 'bg-white' : 'hover:bg-white/80'
                    }`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-950 text-sm font-black text-white">
                      {conversation.avatarUrl ? <img src={conversation.avatarUrl} alt={conversation.name} className="h-full w-full object-cover" /> : conversation.name?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-black text-slate-950">{conversation.name}</p>
                        {conversation.unread ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">{conversation.unread}</span> : null}
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{conversation.role} • {conversation.email}</p>
                      <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-400">{conversation.lastMessage || 'No messages yet'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex min-h-[620px] flex-col">
              {activeAdminConversation ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-black text-slate-950">{activeAdminConversation.name}</h3>
                        <StatusBadge status={activeAdminConversation.status} />
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">{activeAdminConversation.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openProfileDetails(activeAdminConversation.userId, 'user-management')}
                      className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      Profile
                    </button>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-5 py-5">
                    {activeAdminConversation.messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                          message.isMine ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-800'
                        }`}>
                          <p className={`text-[11px] font-black uppercase tracking-[0.12em] ${message.isMine ? 'text-slate-300' : 'text-slate-400'}`}>
                            {message.senderName}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold leading-6">{message.body}</p>
                          <p className={`mt-2 text-[11px] font-bold ${message.isMine ? 'text-slate-300' : 'text-slate-400'}`}>{formatDate(message.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={sendAdminChatMessage} className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4">
                    <textarea
                      value={adminChatBody}
                      onChange={(event) => setAdminChatBody(event.target.value)}
                      rows={2}
                      placeholder={`Message ${activeAdminConversation.name} as Site Admin...`}
                      className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-slate-950"
                    />
                    <button
                      type="submit"
                      disabled={adminChatSending || !adminChatBody.trim()}
                      className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </button>
                  </form>
                </>
              ) : (
                <EmptyState label="Select a conversation to view messages." />
              )}
            </div>
          </div>
        ) : (
          <EmptyState label="No Site Admin conversations yet. Send a message from User Management to start one." />
        )}
      </Panel>
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Verified Accounts" value={formatNumber(statusBreakdown.find((item) => item.name === 'Verified')?.value)} hint="Accounts marked verified" />
        <StatCard icon={FileText} label="Pending Accounts" value={formatNumber(statusBreakdown.find((item) => item.name === 'Pending')?.value)} hint="Accounts needing review" />
        <StatCard icon={Users} label="Team Invites Pending" value={formatNumber(totals.pendingTeamMembers)} hint={`${formatNumber(totals.teamMembers)} total team members`} />
      </section>
      <section className="grid gap-6 xl:grid-cols-2">
        {renderStatusChart()}
        {renderMarketplaceHealth()}
      </section>
      {renderRecentActivity()}
    </div>
  );

  const renderContent = () => {
    if (activeSection === 'registrations') return renderRegistrations();
    if (activeSection === 'campaigns') return renderCampaigns();
    if (activeSection === 'applications') return renderApplications();
    if (activeSection === 'user-management') return renderUserManagement();
    if (activeSection === 'traffic') return <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]">{renderTrafficChart()}{renderTopPages()}</div>;
    if (activeSection === 'messages') return renderMessages();
    if (activeSection === 'audit') return renderAudit();
    return renderOverview();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading admin dashboard
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-['Inter',sans-serif] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-800 bg-slate-950 px-5 py-6 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white">
            <img src={logo} alt="SynkSpace" className="h-8 w-8 object-contain" />
          </span>
          <div>
            <p className="text-lg font-black">SynkSpace</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Site Admin</p>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                activeSection === item.id ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-left text-sm font-bold text-red-200 transition hover:bg-red-500/10 hover:text-red-100"
        >
          <LogOut className="h-5 w-5" />
          Log out
        </button>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 lg:hidden">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950">
                  <img src={logo} alt="SynkSpace" className="h-7 w-7 object-contain" />
                </span>
                <span className="text-lg font-black">SynkSpace Admin</span>
              </div>
              <h1 className="hidden text-2xl font-black text-slate-950 lg:block">{activeNav.label}</h1>
              <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                {activeNav.description} • Refreshed {formatDate(headerUpdatedAt)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeSection === 'registrations') loadRegistrations();
                  if (activeSection === 'campaigns') loadCampaigns();
                  if (activeSection === 'applications') loadApplications();
                  if (activeSection === 'user-management') loadManagedUsers();
                  if (activeSection === 'messages') loadAdminConversations();
                  loadOverview({ silent: true });
                }}
                disabled={refreshing || registrationsLoading || campaignsLoading || applicationsLoading || managedUsersLoading || adminConversationsLoading}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${(refreshing || registrationsLoading || campaignsLoading || applicationsLoading || managedUsersLoading || adminConversationsLoading) ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-bold ${
                  activeSection === item.id ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-8">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}
          {renderContent()}
        </div>
      </main>

      <ProfileDetailsDrawer
        detail={profileDetail}
        loading={profileLoading}
        error={profileError}
        onClose={() => {
          setProfileDetail(null);
          setProfileError('');
        }}
        onUpdateUserStatus={updateUserStatus}
        onOpenMessage={openAdminMessage}
        statusUpdating={statusUpdating}
      />
      <EntityDetailsDrawer
        title={selectedCampaign?.title || (campaignDetailLoading ? 'Loading campaign' : '')}
        subtitle={selectedCampaign ? `${selectedCampaign.ownerName} • ${selectedCampaign.category}` : ''}
        loading={campaignDetailLoading}
        error={campaignDetailError}
        onClose={() => {
          setSelectedCampaign(null);
          setCampaignDetailError('');
        }}
      >
        {selectedCampaign ? (
          <>
            <Panel
              title="Campaign Status"
              subtitle="Admin control for campaign visibility and lifecycle"
              action={
                <SelectControl
                  value={selectedCampaign.status}
                  onChange={(value) => updateCampaignStatus(selectedCampaign.id, value)}
                  options={campaignStatuses.filter((status) => status.id)}
                  ariaLabel="Update selected campaign status"
                />
              }
            >
              <DetailGrid
                data={{
                  campaignId: selectedCampaign.id,
                  status: selectedCampaign.status,
                  owner: selectedCampaign.ownerName,
                  ownerEmail: selectedCampaign.ownerEmail,
                  category: selectedCampaign.category,
                  location: selectedCampaign.location,
                  budgetMin: formatCurrency(selectedCampaign.budgetMin),
                  budgetMax: formatCurrency(selectedCampaign.budgetMax),
                  slots: `${selectedCampaign.filledSlots}/${selectedCampaign.totalSlots}`,
                  applications: selectedCampaign.applicationsCount,
                  deadline: selectedCampaign.deadline,
                  createdAt: selectedCampaign.createdAt,
                }}
              />
            </Panel>
            <Panel title="Campaign Details" subtitle="Saved campaign fields from the database">
              <DetailGrid data={selectedCampaign} />
            </Panel>
            <Panel title="Applications" subtitle="Applications received for this campaign">
              {selectedCampaign.applications?.length ? (
                <div className="space-y-3">
                  {selectedCampaign.applications.map((application) => (
                    <div key={application.id} className="rounded-xl bg-slate-50 px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">{application.creatorName}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{application.creatorEmail} • {formatCurrency(application.proposedRate)}</p>
                        </div>
                        <StatusBadge status={application.status} label={application.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No applications for this campaign yet." />
              )}
            </Panel>
          </>
        ) : null}
      </EntityDetailsDrawer>
      <EntityDetailsDrawer
        title={selectedApplication ? `${selectedApplication.creatorName} application` : (applicationDetailLoading ? 'Loading application' : '')}
        subtitle={selectedApplication ? selectedApplication.campaign?.title : ''}
        loading={applicationDetailLoading}
        error={applicationDetailError}
        onClose={() => {
          setSelectedApplication(null);
          setApplicationDetailError('');
        }}
      >
        {selectedApplication ? (
          <>
            <Panel
              title="Application Status"
              subtitle="Admin control for campaign applications"
              action={
                <SelectControl
                  value={selectedApplication.status}
                  onChange={(value) => updateApplicationStatus(selectedApplication.id, value)}
                  options={applicationStatuses.filter((status) => status.id)}
                  ariaLabel="Update selected application status"
                />
              }
            >
              <DetailGrid
                data={{
                  applicationId: selectedApplication.id,
                  status: selectedApplication.status,
                  creator: selectedApplication.creatorName,
                  creatorEmail: selectedApplication.creatorEmail,
                  campaign: selectedApplication.campaign?.title,
                  owner: selectedApplication.ownerName,
                  proposedRate: formatCurrency(selectedApplication.proposedRate),
                  messages: selectedApplication.messagesCount,
                  appliedAt: selectedApplication.appliedAt,
                }}
              />
            </Panel>
            <Panel title="Application Details" subtitle="Proposal, campaign, contract, escrow, and deliverable data">
              <DetailGrid data={selectedApplication} />
            </Panel>
          </>
        ) : null}
      </EntityDetailsDrawer>
      <AdminMessageDialog
        user={messageUser}
        body={adminMessageBody}
        error={adminMessageError}
        sending={adminMessageSending}
        onBodyChange={setAdminMessageBody}
        onClose={closeAdminMessage}
        onSubmit={sendAdminMessage}
      />
    </div>
  );
}
