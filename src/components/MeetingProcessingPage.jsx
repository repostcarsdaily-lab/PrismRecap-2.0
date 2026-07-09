import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCollectionItem, createNamedCollectionItem, FIRESTORE_COLLECTIONS } from '../services/firebase';

const initialResult = {
  executiveSummary: '',
  keyHighlights: [],
  decisionsMade: [],
  actionItems: [],
  assignees: [],
  deadlines: [],
  risks: [],
  openQuestions: [],
  nextSteps: [],
};

const parseStructuredResponse = (text) => {
  const sections = {
    executiveSummary: '',
    keyHighlights: [],
    decisionsMade: [],
    actionItems: [],
    assignees: [],
    deadlines: [],
    risks: [],
    openQuestions: [],
    nextSteps: [],
  };

  const lines = text.split(/\n+/).map((item) => item.trim()).filter(Boolean);
  let currentSection = null;
  lines.forEach((line) => {
    if (line.toLowerCase().startsWith('executive summary')) {
      currentSection = 'executiveSummary';
      sections.executiveSummary = line.replace(/^executive summary[:\-\s]*/i, '');
      return;
    }
    if (line.toLowerCase().startsWith('key highlights')) {
      currentSection = 'keyHighlights';
      return;
    }
    if (line.toLowerCase().startsWith('decisions made')) {
      currentSection = 'decisionsMade';
      return;
    }
    if (line.toLowerCase().startsWith('action items')) {
      currentSection = 'actionItems';
      return;
    }
    if (line.toLowerCase().startsWith('assignees')) {
      currentSection = 'assignees';
      return;
    }
    if (line.toLowerCase().startsWith('deadlines')) {
      currentSection = 'deadlines';
      return;
    }
    if (line.toLowerCase().startsWith('risks')) {
      currentSection = 'risks';
      return;
    }
    if (line.toLowerCase().startsWith('open questions')) {
      currentSection = 'openQuestions';
      return;
    }
    if (line.toLowerCase().startsWith('next steps')) {
      currentSection = 'nextSteps';
      return;
    }

    if (/^-\s+/.test(line)) {
      const bullet = line.replace(/^-\s+/, '');
      if (currentSection) {
        sections[currentSection].push(bullet);
      }
    } else if (currentSection === 'executiveSummary' && !sections.executiveSummary) {
      sections.executiveSummary = line;
    }
  });

  return {
    ...sections,
    executiveSummary: sections.executiveSummary || 'Summary generated successfully.',
    keyHighlights: sections.keyHighlights || ['Highlights captured.'],
    decisionsMade: sections.decisionsMade || ['Decisions captured.'],
    actionItems: sections.actionItems || ['Action items captured.'],
    assignees: sections.assignees || ['Team follow-up'],
    deadlines: sections.deadlines || ['No explicit deadlines'],
    risks: sections.risks || ['No major risks detected'],
    openQuestions: sections.openQuestions || ['No open questions'],
    nextSteps: sections.nextSteps || ['Next steps outlined.'],
  };
};

function MeetingProcessingPage() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [transcript, setTranscript] = useState('');
  const [fileName, setFileName] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(initialResult);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const canProcess = useMemo(() => transcript.trim().length > 0 || audioFile, [transcript, audioFile]);

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;
    setFileName(uploadedFile.name);
    if (uploadedFile.type.startsWith('audio/')) {
      setAudioFile(uploadedFile);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setTranscript((prev) => prev ? `${prev}\n${reader.result}` : String(reader.result));
    };
    reader.readAsText(uploadedFile);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
        setFileName(file.name);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setIsRecording(true);
    } catch {
      setError('Microphone access was denied or unavailable.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const processMeeting = async () => {
    if (!canProcess) {
      setError('Please paste a transcript, upload a file, or record audio before processing.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      let finalTranscript = transcript.trim();

      if (audioFile) {
        const formData = new FormData();
        formData.append('file', audioFile);
        const transcribeResponse = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });
        if (!transcribeResponse.ok) {
          throw new Error('Audio transcription failed.');
        }
        const transcription = await transcribeResponse.json();
        finalTranscript = `${finalTranscript}\n${transcription.text || ''}`.trim();
      }

      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: finalTranscript }),
      });

      if (!response.ok) {
        throw new Error('AI processing failed.');
      }

      const payload = await response.json();
      const parsed = parseStructuredResponse(payload.content || '');
      setResult(parsed);

      const meetingId = await createCollectionItem(FIRESTORE_COLLECTIONS.meetings, {
        title: 'Processed Meeting',
        transcript: finalTranscript,
        summary: parsed.executiveSummary,
        createdBy: profile?.uid || 'anonymous',
        createdAt: new Date().toISOString(),
      });

      await createNamedCollectionItem(FIRESTORE_COLLECTIONS.meetingHistory, meetingId, {
        title: 'Processed Meeting',
        summary: parsed.executiveSummary,
        createdAt: new Date().toISOString(),
      });

      await createCollectionItem(FIRESTORE_COLLECTIONS.tasks, {
        meetingId,
        title: parsed.actionItems[0] || 'Review meeting output',
        status: 'Pending',
        assignee: parsed.assignees[0] || 'Team',
        dueDate: parsed.deadlines[0] || 'TBD',
      });

      setRetryCount(0);
    } catch (err) {
      setRetryCount((count) => count + 1);
      setError(err.message || 'Processing failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-badge">PR</div>
          <div>
            <p className="eyebrow">PrismRecap AI Workspace</p>
            <h1>Meeting Processing</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="profile-pill">{profile?.name || 'Team Member'}</span>
          <button className="ghost-btn" onClick={() => navigate('/dashboard')} type="button">Dashboard</button>
          <button className="ghost-btn" onClick={logout} type="button">Logout</button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">AI Workflow</p>
            <h2>Process meetings into executive-ready outputs.</h2>
            <p>Paste a transcript, upload files, or record audio directly in the browser and turn the conversation into structured insights instantly.</p>
          </div>
          <div className="hero-summary">
            <div className="summary-pill">Groq AI</div>
            <div className="summary-value">Secure processing</div>
            <p>All processing runs through protected routes and saves into Firestore.</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Capture Meeting Input</h3>
          </div>
          <div className="upload-grid">
            <label className="upload-card">
              <span>Paste transcript</span>
              <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste your meeting transcript here..." />
            </label>
            <label className="upload-card">
              <span>Upload transcript or audio</span>
              <input type="file" accept=".txt,.docx,.pdf,.mp3,.wav,.m4a" onChange={handleFileUpload} />
              <small>{fileName || 'Accepted: .txt, .docx, .pdf, .mp3, .wav, .m4a'}</small>
            </label>
            <div className="upload-card">
              <span>Record audio</span>
              <div className="recording-actions">
                <button className="primary-btn" type="button" onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
              <small>{isRecording ? 'Recording in progress…' : 'Use your microphone to record.'}</small>
            </div>
          </div>
          <div className="hero-actions">
            <button className="primary-btn" type="button" onClick={processMeeting} disabled={isProcessing || !canProcess}>
              {isProcessing ? 'Processing...' : 'Process Meeting'}
            </button>
            {retryCount > 0 && <span className="profile-pill">Retry attempts: {retryCount}</span>}
          </div>
          {error ? <p className="auth-message">{error}</p> : null}
        </section>

        <section className="stats-grid">
          {[
            { label: 'Executive Summary', value: result.executiveSummary.slice(0, 60) || 'Pending', accent: 'accent-a' },
            { label: 'Key Highlights', value: `${result.keyHighlights.length} items`, accent: 'accent-b' },
            { label: 'Action Items', value: `${result.actionItems.length} items`, accent: 'accent-c' },
            { label: 'Risks', value: `${result.risks.length} flagged`, accent: 'accent-d' },
          ].map((item) => (
            <article key={item.label} className={`panel stat-card ${item.accent}`}>
              <p className="stat-label">{item.label}</p>
              <h3>{item.value}</h3>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-header"><h3>Executive Summary</h3></div>
            <p>{result.executiveSummary || 'Processing will generate a concise executive summary here.'}</p>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Key Highlights</h3></div>
            <ul className="item-list">
              {result.keyHighlights.map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Decisions Made</h3></div>
            <ul className="item-list">
              {result.decisionsMade.map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Action Items</h3></div>
            <ul className="item-list">
              {result.actionItems.map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Assignees & Deadlines</h3></div>
            <ul className="item-list">
              {result.assignees.map((item, index) => <li key={`${item}-${index}`}><span>{item}</span><span>{result.deadlines[index] || 'TBD'}</span></li>)}
            </ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Risks & Open Questions</h3></div>
            <ul className="item-list">
              {result.risks.map((item) => <li key={item}><span>{item}</span></li>)}
              {result.openQuestions.map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </article>
          <article className="panel">
            <div className="panel-header"><h3>Next Steps</h3></div>
            <ul className="item-list">
              {result.nextSteps.map((item) => <li key={item}><span>{item}</span></li>)}
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}

export default MeetingProcessingPage;
