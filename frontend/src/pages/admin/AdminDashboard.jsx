import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  ChevronRight,
  Eye,
  FileText,
  Globe2,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { apiGet } from '../../lib/api';
import { clearAuthSession } from '../../lib/auth';

const roleColors = ['#0f172a', '#2563eb', '#0891b2', '#f59e0b'];
const statusColors = {
  Pending: '#f59e0b',
  Verified: '#10b981',
  Suspended: '#ef4444',
};

const navItems = [
  { id: 'overview', icon: BarChart3, label: 'Overview' },
  { id: 'registrations', icon: Users, label: 'Registrations' },
  { id: 'traffic', icon: Globe2, label: 'Traffic' },
  { id: 'messages', icon: MessageSquare, label: 'Messages' },
  { id: 'audit', icon: ShieldCheck, label: 'Audit' },
];

const registrationRoles = [
  { id: 'CREATOR', label: 'Content Creators', countKey: 'creators' },
  { id: 'BRAND', label: 'Brands', countKey: 'brands' },
  { id: 'ORGANISER', label: 'Event Organisers', countKey: 'organisers' },
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

function ProfileDetailsDrawer({ detail, loading, error, onClose }) {
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
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">{detail.status}</span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
                        {detail.emailVerified ? 'Email verified' : 'Email pending'}
                      </span>
                    </div>
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
                    emailVerified: detail.emailVerified,
                    registeredAt: detail.createdAt,
                    updatedAt: detail.updatedAt,
                    applications: detail.counts?.applications,
                    campaigns: detail.counts?.campaignsAsBrand,
                    messagesSent: detail.counts?.messagesSent,
                    messagesReceived: detail.counts?.messagesReceived,
                    teamMembers: detail.counts?.ownedTeamMembers,
                    notifications: detail.counts?.notifications,
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const openProfileDetails = async (userId) => {
    setProfileDetail(null);
    setProfileError('');
    setProfileLoading(true);
    try {
      const response = await apiGet(`/api/admin/registrations/${userId}`);
      setProfileDetail(response?.data || null);
    } catch (detailsError) {
      setProfileError(detailsError?.message || 'Could not load profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeSection === 'registrations') loadRegistrations();
  }, [activeSection, registrationRole, registrations.page, submittedSearch]);

  const totals = overview?.totals || {};
  const activeNav = navItems.find((item) => item.id === activeSection) || navItems[0];
  const roleBreakdown = useMemo(
    () => (overview?.roleBreakdown || []).filter((item) => Number(item.value || 0) > 0),
    [overview]
  );
  const trafficDateTicks = useMemo(() => {
    const rows = overview?.daily || [];
    if (rows.length <= 7) return rows.map((row) => row.label);

    const targetTickCount = rows.length > 21 ? 5 : 4;
    const tickIndexes = new Set([0, rows.length - 1]);
    for (let index = 1; index < targetTickCount - 1; index += 1) {
      tickIndexes.add(Math.round(((rows.length - 1) * index) / (targetTickCount - 1)));
    }

    return [...tickIndexes]
      .sort((first, second) => first - second)
      .map((index) => rows[index]?.label)
      .filter(Boolean);
  }, [overview]);
  const statusBreakdown = overview?.statusBreakdown || [];
  const hasDailyData = (overview?.daily || []).some((row) => Number(row.visits || 0) > 0 || Number(row.registrations || 0) > 0);
  const messageActivities = (overview?.recentActivity || []).filter((activity) => activity.type === 'Message');

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
    <Panel title="Traffic and Registrations" subtitle="Page views and user registrations over the last 30 days">
      <div className="h-80">
        {hasDailyData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={overview?.daily || []} margin={{ top: 10, right: 16, left: -18, bottom: 12 }}>
              <defs>
                <linearGradient id="visits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis
                dataKey="label"
                ticks={trafficDateTicks}
                interval={0}
                minTickGap={28}
                height={38}
                tickMargin={10}
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={3} fill="url(#visits)" />
              <Area type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={3} fill="url(#registrations)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState label="Traffic will appear here as visitors use the website." />
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

  const renderMessages = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={MessageSquare} label="Total Messages" value={formatNumber(totals.messages)} hint={`${formatNumber(totals.directMessages)} direct messages`} />
        <StatCard icon={Mail} label="Direct Messages" value={formatNumber(totals.directMessages)} hint="Stored for audit access" />
        <StatCard icon={Activity} label="Recent Message Events" value={formatNumber(messageActivities.length)} hint="From latest activity feed" />
      </section>
      <Panel title="Recent Message Activity" subtitle="Latest message events captured from the database">
        <div className="space-y-3">
          {messageActivities.length ? messageActivities.map((item) => (
            <div key={item.id} className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-800">{item.title}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">{formatDate(item.at)}</p>
            </div>
          )) : <EmptyState label="No recent message activity found." />}
        </div>
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
                Updated {formatDate(overview?.generatedAt)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (activeSection === 'registrations') loadRegistrations();
                  loadOverview({ silent: true });
                }}
                disabled={refreshing || registrationsLoading}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${(refreshing || registrationsLoading) ? 'animate-spin' : ''}`} />
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
      />
    </div>
  );
}
