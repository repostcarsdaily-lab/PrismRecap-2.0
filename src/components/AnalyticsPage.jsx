import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { db, FIRESTORE_COLLECTIONS } from '../services/firebase';
import { summarizeAnalytics } from '../services/analytics';
import { BarChart, CircleChart, LineChart, ProductivityBars } from './analytics/AnalyticsCharts';

const REPORT_TYPES = ['Weekly Report', 'Monthly Report', 'Quarterly Report', 'Yearly Report'];

function StatCard({ label, value, detail, accent }) {
  return (
    <article className={`panel stat-card ${accent}`}>
      <p className="stat-label">{label}</p>
      <h3>{value}</h3>
      <span>{detail}</span>
    </article>
  );
}

function AnalyticsPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [emailHistory, setEmailHistory] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [department, setDepartment] = useState('All');
  const [user, setUser] = useState('All');
  const [meeting, setMeeting] = useState('All');
  const [reportType, setReportType] = useState('Weekly Report');

  useEffect(() => {
    const unsubscribeMeetings = onSnapshot(collection(db, FIRESTORE_COLLECTIONS.meetings), (snapshot) => {
      setMeetings(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => setError(err.message || 'Unable to load meetings'));

    const unsubscribeTasks = onSnapshot(collection(db, FIRESTORE_COLLECTIONS.tasks), (snapshot) => {
      setTasks(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => setError(err.message || 'Unable to load tasks'));

    const unsubscribeEmails = onSnapshot(query(collection(db, FIRESTORE_COLLECTIONS.emailHistory), orderBy('createdAt', 'desc')), (snapshot) => {
      setEmailHistory(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => setError(err.message || 'Unable to load emails'));

    const unsubscribeMessages = onSnapshot(collection(db, FIRESTORE_COLLECTIONS.messages), (snapshot) => {
      setMessages(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => setError(err.message || 'Unable to load chat activity'));

    const unsubscribeUsers = onSnapshot(collection(db, FIRESTORE_COLLECTIONS.users), (snapshot) => {
      setUsers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    }, (err) => setError(err.message || 'Unable to load users'));

    return () => {
      unsubscribeMeetings();
      unsubscribeTasks();
      unsubscribeEmails();
      unsubscribeMessages();
      unsubscribeUsers();
    };
  }, []);

  useEffect(() => {
    if (meetings.length || tasks.length || emailHistory.length || messages.length || users.length) {
      setLoading(false);
    }
  }, [meetings, tasks, emailHistory, messages, users]);

  const filteredData = useMemo(() => {
    const byDepartment = (entry) => department === 'All' || entry.department === department || entry.createdByDepartment === department;
    const byUser = (entry) => user === 'All' || entry.createdBy === user || entry.userId === user;
    const byMeeting = (entry) => meeting === 'All' || entry.meetingId === meeting || entry.id === meeting;

    const filteredMeetings = meetings.filter((entry) => {
      const matches = byDepartment(entry) && byUser(entry) && byMeeting(entry);
      if (!matches) return false;
      if (dateRange === 'week') {
        const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
        return createdAt && createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      }
      if (dateRange === 'month') {
        const createdAt = entry.createdAt ? new Date(entry.createdAt) : null;
        return createdAt && createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
      return true;
    });

    const filteredTasks = tasks.filter((entry) => byDepartment(entry) && byUser(entry) && byMeeting(entry));
    const filteredEmails = emailHistory.filter((entry) => byDepartment(entry) && byUser(entry) && byMeeting(entry));
    const filteredMessages = messages.filter((entry) => byDepartment(entry) && byUser(entry) && byMeeting(entry));
    const filteredUsers = users.filter((entry) => department === 'All' || entry.department === department);

    return { meetings: filteredMeetings, tasks: filteredTasks, emailHistory: filteredEmails, messages: filteredMessages, users: filteredUsers };
  }, [meetings, tasks, emailHistory, messages, users, dateRange, department, user, meeting]);

  const analytics = useMemo(() => summarizeAnalytics(filteredData), [filteredData]);

  const exportReport = async (format) => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Meetings', analytics.kpis.totalMeetings],
      ['Meetings This Week', analytics.kpis.meetingsProcessedThisWeek],
      ['Meetings This Month', analytics.kpis.meetingsProcessedThisMonth],
      ['Total Action Items', analytics.kpis.totalActionItems],
      ['Completed Tasks', analytics.kpis.completedTasks],
      ['Pending Tasks', analytics.kpis.pendingTasks],
      ['Overdue Tasks', analytics.kpis.overdueTasks],
      ['Productivity Score', `${analytics.kpis.productivityScore}%`],
      ['Average Meeting Duration', `${analytics.kpis.averageMeetingDuration} min`],
      ['Average Processing Time', `${analytics.kpis.averageProcessingTime} min`],
      ['AI Usage Statistics', analytics.kpis.aiUsageStatistics],
      ['Emails Sent', analytics.kpis.emailsSent],
      ['Chat Activity', analytics.kpis.chatActivity],
      ['Active Users', analytics.kpis.activeUsers],
    ];

    const csv = rows.map((row) => row.map((cell) => String(cell).replace(/,/g, ';')).join(',')).join('\n');
    if (format === 'csv') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}.csv`;
      link.click();
      return;
    }

    if (format === 'xlsx') {
      const worksheetRows = rows.map((row) => row.map((cell) => `<c t="inlineStr"><is><t>${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</t></is></c>`));
      const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>${worksheetRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((cell, cellIndex) => `<c r="${String.fromCharCode(65 + cellIndex)}${rowIndex + 1}" t="inlineStr">${cell}</c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
      const zip = new JSZip();
      zip.file('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>');
      zip.file('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
      zip.file('xl/worksheets/sheet1.xml', sheetXml);
      zip.file('xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>');
      zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
      zip.file('docProps/app.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>PrismRecap</Application></Properties>');
      zip.file('docProps/core.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Analytics Report</dc:title></cp:coreProperties>');
      const blob = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}.xlsx`;
      link.click();
      return;
    }

    if (format === 'pdf') {
      const text = `Analytics report: ${reportType}\n${rows.map((row) => row.join(': ')).join('\n')}`;
      const pdfContent = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R>>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1>>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length 44 >>stream\nBT /F1 12 Tf 72 720 Td (${text.replace(/\n/g, ' ')}) Tj ET\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000119 00000 n \n0000000203 00000 n \n0000000300 00000 n \ntrailer<< /Root 1 0 R /Size 6 >>\nstartxref\n0\n%%EOF`;
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${reportType.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      link.click();
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">AN</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Analytics & Reports</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="ghost-btn" type="button" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Real-time insights</p>
            <h2>Measure team performance, AI workflow adoption, and communication health.</h2>
            <p>Every metric is derived from live Firebase collections so the analytics remain actionable and current.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Live analytics</div>
            <div className="summary-value">{analytics.kpis.totalMeetings} meetings</div>
            <p>Filtered view based on the selected scope and audience.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3> Filters </h3>
          </div>
          <div className="filter-grid">
            <select className="input-field" value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
              <option value="all">All time</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
            <select className="input-field" value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option value="All">All departments</option>
              {analytics.filters.departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input-field" value={user} onChange={(event) => setUser(event.target.value)}>
              <option value="All">All users</option>
              {analytics.filters.users.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="input-field" value={meeting} onChange={(event) => setMeeting(event.target.value)}>
              <option value="All">All meetings</option>
              {analytics.filters.meetings.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select className="input-field" value={reportType} onChange={(event) => setReportType(event.target.value)}>
              {REPORT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <div className="hero-actions">
              <button className="primary-btn" type="button" onClick={() => exportReport('csv')}>Export CSV</button>
              <button className="ghost-btn" type="button" onClick={() => exportReport('xlsx')}>Export XLSX</button>
              <button className="secondary-btn" type="button" onClick={() => exportReport('pdf')}>Export PDF</button>
            </div>
          </div>
        </section>

        {loading ? <div className="loading-screen">Loading analytics…</div> : (
          <>
            <section className="stats-grid">
              <StatCard label="Total meetings" value={analytics.kpis.totalMeetings} detail="All captured meetings" accent="accent-a" />
              <StatCard label="Meetings processed this week" value={analytics.kpis.meetingsProcessedThisWeek} detail="Recent AI workflow activity" accent="accent-b" />
              <StatCard label="Meetings processed this month" value={analytics.kpis.meetingsProcessedThisMonth} detail="Current monthly volume" accent="accent-c" />
              <StatCard label="Total action items" value={analytics.kpis.totalActionItems} detail="Tasks generated from meetings" accent="accent-d" />
              <StatCard label="Completed tasks" value={analytics.kpis.completedTasks} detail="Successful follow-through" accent="accent-e" />
              <StatCard label="Pending tasks" value={analytics.kpis.pendingTasks} detail="Open follow-ups" accent="accent-f" />
              <StatCard label="Overdue tasks" value={analytics.kpis.overdueTasks} detail="Needs attention" accent="accent-a" />
              <StatCard label="Productivity score" value={`${analytics.kpis.productivityScore}%`} detail="Completion efficiency" accent="accent-b" />
              <StatCard label="Average meeting duration" value={`${analytics.kpis.averageMeetingDuration} min`} detail="Average call time" accent="accent-c" />
              <StatCard label="Average processing time" value={`${analytics.kpis.averageProcessingTime} min`} detail="AI processing turnaround" accent="accent-d" />
              <StatCard label="AI usage statistics" value={analytics.kpis.aiUsageStatistics} detail="AI-backed meetings" accent="accent-e" />
              <StatCard label="Emails sent" value={analytics.kpis.emailsSent} detail="Outbound communication" accent="accent-f" />
              <StatCard label="Chat activity" value={analytics.kpis.chatActivity} detail="Messages exchanged" accent="accent-a" />
              <StatCard label="Active users" value={analytics.kpis.activeUsers} detail="People in the workspace" accent="accent-b" />
            </section>

            <section className="charts-grid">
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Meetings per day</h3></div>
                <BarChart data={analytics.charts.meetingsPerDay} labels={analytics.charts.meetingsPerDay.map((item) => item.label)} />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Meetings per month</h3></div>
                <BarChart data={analytics.charts.meetingsPerMonth} labels={analytics.charts.meetingsPerMonth.map((item) => item.label)} />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Tasks completed over time</h3></div>
                <LineChart data={analytics.charts.tasksCompletedOverTime} labels={analytics.charts.tasksCompletedOverTime.map((item) => item.label)} />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Department productivity</h3></div>
                <ProductivityBars data={analytics.charts.departmentProductivity} />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>AI usage</h3></div>
                <BarChart data={analytics.charts.aiUsage} labels={analytics.charts.aiUsage.map((item) => item.label)} accent="accent-b" />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Email activity</h3></div>
                <BarChart data={analytics.charts.emailActivity} labels={analytics.charts.emailActivity.map((item) => item.label)} accent="accent-c" />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Chat activity</h3></div>
                <BarChart data={analytics.charts.chatActivity} labels={analytics.charts.chatActivity.map((item) => item.label)} accent="accent-d" />
              </article>
              <article className="panel chart-panel">
                <div className="panel-header"><h3>Report snapshot</h3></div>
                <CircleChart value={analytics.kpis.productivityScore} label="Productivity score" />
              </article>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>Reports</h3>
              </div>
              <div className="action-grid">
                {REPORT_TYPES.map((type) => (
                  <button key={type} className="action-btn" type="button" onClick={() => setReportType(type)}>{type}</button>
                ))}
              </div>
            </section>
          </>
        )}
        {error ? <p className="auth-message">{error}</p> : null}
      </main>
    </div>
  );
}

export default AnalyticsPage;
