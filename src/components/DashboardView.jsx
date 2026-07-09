import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const translations = {
  en: {
    brand: 'PrismRecap AI Workspace',
    title: 'Executive Dashboard',
    welcome: 'Welcome back',
    heroTitle: 'Turn every meeting into a strategic advantage.',
    heroText:
      'Monitor execution, automate follow-ups and keep your team aligned with a calm premium view of work.',
    primaryAction: 'New Meeting',
    secondaryAction: 'Upload Transcript',
    totalMeetings: 'Total Meetings',
    aiProcessedMeetings: 'AI Processed Meetings',
    pendingTasks: 'Pending Tasks',
    completedTasks: 'Completed Tasks',
    timeSaved: 'Time Saved',
    productivityScore: 'Productivity Score',
    meetingsByMonth: 'Meetings per month',
    tasksCompleted: 'Tasks completed',
    aiUsage: 'AI usage',
    teamProductivity: 'Team productivity',
    recentMeetings: 'Recent Meetings',
    upcomingDeadlines: 'Upcoming Deadlines',
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    viewAll: 'View all',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    language: 'Português',
    summaryLabel: 'Weekly pulse',
    summaryValue: '82% on track',
    summaryHint: 'Momentum is rising across the team.',
    actionNewMeeting: 'New Meeting',
    actionUploadTranscript: 'Upload Transcript',
    actionOpenKanban: 'Open Kanban',
    actionEmailCenter: 'Email Center',
    actionAnalytics: 'Analytics',
    meetingLabel: 'Meeting',
    taskLabel: 'Task',
    activityLabel: 'Activity',
    logout: 'Logout',
  },
  pt: {
    brand: 'Espaço de trabalho PrismRecap AI',
    title: 'Painel Executivo',
    welcome: 'Bem-vindo de volta',
    heroTitle: 'Transforme cada reunião em uma vantagem estratégica.',
    heroText:
      'Acompanhe a execução, automatize acompanhamentos e mantenha a equipe alinhada com uma visão premium e tranquila do trabalho.',
    primaryAction: 'Nova Reunião',
    secondaryAction: 'Enviar Transcrição',
    totalMeetings: 'Total de Reuniões',
    aiProcessedMeetings: 'Reuniões Processadas por IA',
    pendingTasks: 'Tarefas Pendentes',
    completedTasks: 'Tarefas Concluídas',
    timeSaved: 'Tempo Economizado',
    productivityScore: 'Pontuação de Produtividade',
    meetingsByMonth: 'Reuniões por mês',
    tasksCompleted: 'Tarefas concluídas',
    aiUsage: 'Uso de IA',
    teamProductivity: 'Produtividade da equipe',
    recentMeetings: 'Reuniões Recentes',
    upcomingDeadlines: 'Próximos Prazos',
    recentActivity: 'Atividade Recente',
    quickActions: 'Ações Rápidas',
    viewAll: 'Ver tudo',
    lightMode: 'Modo claro',
    darkMode: 'Modo escuro',
    language: 'English',
    summaryLabel: 'Pulso semanal',
    summaryValue: '82% no caminho',
    summaryHint: 'O impulso está crescendo em toda a equipe.',
    actionNewMeeting: 'Nova Reunião',
    actionUploadTranscript: 'Enviar Transcrição',
    actionOpenKanban: 'Abrir Kanban',
    actionEmailCenter: 'Centro de E-mails',
    actionAnalytics: 'Análises',
    meetingLabel: 'Reunião',
    taskLabel: 'Tarefa',
    activityLabel: 'Atividade',
    logout: 'Sair',
  },
};

const meetingSeries = [42, 51, 48, 61, 73, 69];
const taskSeries = [28, 35, 31, 46, 54, 61];
const aiSeries = [68, 74, 81, 79, 88, 92];
const productivitySeries = [74, 79, 82, 86, 89, 91];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

function StatCard({ label, value, detail, accent }) {
  return (
    <article className={`panel stat-card ${accent}`}>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
      <span>{detail}</span>
    </article>
  );
}

function PanelHeader({ title, action }) {
  return (
    <div className="panel-header">
      <h3>{title}</h3>
      {action ? <a href="#">{action}</a> : null}
    </div>
  );
}

function SimpleBarChart({ data, labels }) {
  const max = Math.max(...data);

  return (
    <div className="chart-area" role="img" aria-label="Bar chart">
      {data.map((item, index) => (
        <div key={labels[index]} className="bar-column">
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${(item / max) * 100}%` }} />
          </div>
          <span>{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function SimpleLineChart({ data, labels }) {
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - (value / Math.max(...data)) * 80;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-area line-chart" role="img" aria-label="Line chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points={points} />
      </svg>
      <div className="axis-labels">
        {labels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function CircularChart({ value, label }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  return (
    <div className="circular-chart">
      <svg viewBox="0 0 120 120">
        <circle className="ring-bg" cx="60" cy="60" r={radius} />
        <circle
          className="ring-progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={progress}
        />
      </svg>
      <div className="circular-content">
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ProductivityBars({ data, labels }) {
  return (
    <div className="productivity-list">
      {data.map((value, index) => (
        <div key={labels[index]} className="productivity-row">
          <div className="productivity-meta">
            <span>{labels[index]}</span>
            <strong>{value}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DashboardView() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('prism-theme') || 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('prism-language') || 'en');

  useEffect(() => {
    document.body.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('prism-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('prism-language', language);
  }, [language]);

  const t = translations[language];

  const kpis = [
    { label: t.totalMeetings, value: '184', detail: '+12% vs last month', accent: 'accent-a' },
    { label: t.aiProcessedMeetings, value: '156', detail: '84% automated', accent: 'accent-b' },
    { label: t.pendingTasks, value: '27', detail: '4 due today', accent: 'accent-c' },
    { label: t.completedTasks, value: '319', detail: '91% on schedule', accent: 'accent-d' },
    { label: t.timeSaved, value: '42h', detail: 'Per week', accent: 'accent-e' },
    { label: t.productivityScore, value: '91/100', detail: 'Steady growth', accent: 'accent-f' },
  ];

  const meetings = [
    { title: 'Product Strategy Sync', time: '09:30 • Today', owner: 'Mina' },
    { title: 'Customer Retention Review', time: '14:00 • Tomorrow', owner: 'Jon' },
    { title: 'Ops Playbook Refinement', time: '16:30 • Friday', owner: 'Ariana' },
  ];

  const deadlines = [
    { title: 'Q3 Launch Checklist', due: 'Due in 2 days' },
    { title: 'Client Summary Deck', due: 'Due in 5 days' },
    { title: 'Budget Review', due: 'Due in 7 days' },
  ];

  const activity = [
    { title: 'Transcript uploaded', detail: 'Northwind follow-up • 12 mins ago' },
    { title: 'Action items synced', detail: 'Shared with leadership • 34 mins ago' },
    { title: 'AI summary approved', detail: 'Revenue review • 1h ago' },
  ];

  const actions = [
    { label: t.actionNewMeeting, route: '/meeting-processing' },
    { label: t.actionUploadTranscript, route: '/meeting-processing' },
    { label: t.actionOpenKanban, route: '/kanban' },
    { label: t.actionEmailCenter, route: '/email-center' },
    { label: t.actionAnalytics, route: '/analytics' },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">PR</div>
          <div>
            <p className="eyebrow">{t.brand}</p>
            <h1>{t.title}</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')} type="button">
            {t.language}
          </button>
          <button className="ghost-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} type="button">
            {theme === 'light' ? t.darkMode : t.lightMode}
          </button>
          <button className="ghost-btn" onClick={logout} type="button">
            {t.logout}
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">{t.welcome}</p>
            <h2>{t.heroTitle}</h2>
            <p>{t.heroText}</p>
            <div className="hero-actions">
              <button className="primary-btn" type="button">{t.primaryAction}</button>
              <button className="secondary-btn" type="button">{t.secondaryAction}</button>
            </div>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">{t.summaryLabel}</div>
            <div className="summary-value">{t.summaryValue}</div>
            <p>{t.summaryHint}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Workspace navigation</h3>
          </div>
          <div className="workspace-nav-grid">
            {[
              { label: 'Dashboard', route: '/dashboard' },
              { label: 'Meeting Processing', route: '/meeting-processing' },
              { label: 'Meeting History', route: '/meeting-history' },
              { label: 'Kanban', route: '/kanban' },
              { label: 'Email Center', route: '/email-center' },
              { label: 'Team Chat', route: '/team-chat' },
              { label: 'Notifications', route: '/notifications' },
              { label: 'Analytics', route: '/analytics' },
            ].map((item) => (
              <button key={item.route} className="action-btn" type="button" onClick={() => navigate(item.route)}>
                {item.label}
              </button>
            ))}
          </div>
        </section>

        <section className="stats-grid" aria-label="Key performance indicators">
          {kpis.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </section>

        <section className="charts-grid">
          <article className="panel chart-panel">
            <PanelHeader title={t.meetingsByMonth} action={t.viewAll} />
            <SimpleBarChart data={meetingSeries} labels={monthLabels} />
          </article>
          <article className="panel chart-panel">
            <PanelHeader title={t.tasksCompleted} action={t.viewAll} />
            <SimpleLineChart data={taskSeries} labels={monthLabels} />
          </article>
          <article className="panel chart-panel compact">
            <PanelHeader title={t.aiUsage} />
            <CircularChart value={92} label={t.aiProcessedMeetings} />
          </article>
          <article className="panel chart-panel">
            <PanelHeader title={t.teamProductivity} />
            <ProductivityBars data={productivitySeries} labels={monthLabels} />
          </article>
        </section>

        <section className="content-grid">
          <article className="panel">
            <PanelHeader title={t.recentMeetings} action={t.viewAll} />
            <ul className="item-list">
              {meetings.map((meeting) => (
                <li key={meeting.title}>
                  <div>
                    <strong>{meeting.title}</strong>
                    <p>{meeting.time}</p>
                  </div>
                  <span>{meeting.owner}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <PanelHeader title={t.upcomingDeadlines} />
            <ul className="item-list">
              {deadlines.map((deadline) => (
                <li key={deadline.title}>
                  <div>
                    <strong>{deadline.title}</strong>
                    <p>{deadline.due}</p>
                  </div>
                  <span className="tag">{t.taskLabel}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <PanelHeader title={t.recentActivity} />
            <ul className="activity-list">
              {activity.map((entry) => (
                <li key={entry.title}>
                  <div className="dot" />
                  <div>
                    <strong>{entry.title}</strong>
                    <p>{entry.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel">
            <PanelHeader title={t.quickActions} />
            <div className="action-grid">
              {actions.map((action) => (
                <button key={action.label} className="action-btn" type="button" onClick={() => navigate(action.route)}>
                  {action.label}
                </button>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default DashboardView;
