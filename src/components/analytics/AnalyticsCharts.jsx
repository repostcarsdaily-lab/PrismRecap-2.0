function BarChart({ data, labels, accent = 'default' }) {
  const max = Math.max(...data.map((item) => item.value || 0), 1);
  return (
    <div className="chart-area" role="img" aria-label="Bar chart">
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="bar-column">
          <div className="bar-track">
            <div className={`bar-fill ${accent}`} style={{ height: `${Math.max((item.value || 0) / max * 100, 6)}%` }} />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, labels }) {
  const max = Math.max(...data.map((item) => item.value || 0), 1);
  const points = data
    .map((item, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - ((item.value || 0) / max) * 80;
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

function CircleChart({ value, label }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (value / 100) * circumference;

  return (
    <div className="circular-chart">
      <svg viewBox="0 0 120 120">
        <defs>
          <linearGradient id="analytics-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <circle className="ring-bg" cx="60" cy="60" r={radius} />
        <circle className="ring-progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={progress} stroke="url(#analytics-gradient)" />
      </svg>
      <div className="circular-content">
        <strong>{value}%</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ProductivityBars({ data }) {
  return (
    <div className="productivity-list">
      {data.map((item) => (
        <div key={item.label} className="productivity-row">
          <div className="productivity-meta">
            <span>{item.label}</span>
            <strong>{item.value}%</strong>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export { BarChart, LineChart, CircleChart, ProductivityBars };
