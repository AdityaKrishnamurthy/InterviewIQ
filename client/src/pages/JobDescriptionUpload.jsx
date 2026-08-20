import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { Upload, Briefcase, Trash, Spinner, Check } from '../components/Icon';
import { API_BASE_URL } from '../config/api';

const JobDescriptionUpload = () => {
  const [jdMode, setJdMode] = useState('text'); // 'text' | 'pdf'
  const [jdFile, setJdFile] = useState(null);
  const [jdDragActive, setJdDragActive] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdTitle, setJdTitle] = useState('');
  const [uploadingJd, setUploadingJd] = useState(false);
  const [deletingJd, setDeletingJd] = useState(false);
  const [parsedJd, setParsedJd] = useState(null);
  const [loadingJd, setLoadingJd] = useState(true);

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestJd = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/jd/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setParsedJd(data.jd);
        }
      } catch (err) {
        console.error('Error fetching existing JD:', err);
      } finally {
        setLoadingJd(false);
      }
    };

    if (token) {
      fetchLatestJd();
    }
  }, [token]);

  const handleJdDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setJdDragActive(true);
    else if (e.type === 'dragleave') setJdDragActive(false);
  };

  const handleJdDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setJdDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetJdFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetJdFile = (selectedFile) => {
    setError('');
    setSuccessMessage('');
    if (!selectedFile.name.endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file (.pdf) for the Job Description');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    setJdFile(selectedFile);
  };

  const handleUploadJdPdf = async (e) => {
    e.preventDefault();
    if (!jdFile) {
      setError('Please select a Job Description PDF file first');
      return;
    }

    setError('');
    setSuccessMessage('');
    setUploadingJd(true);

    const formData = new FormData();
    formData.append('jd', jdFile);
    if (jdTitle.trim()) {
      formData.append('title', jdTitle.trim());
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/jd/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to parse Job Description');

      setParsedJd(data.jd);
      setJdFile(null);
      setJdTitle('');
      setSuccessMessage('Job Description parsed and saved successfully!');
    } catch (err) {
      setError(err.message || 'Error uploading Job Description. Please try again.');
    } finally {
      setUploadingJd(false);
    }
  };

  const handleSaveJdText = async (e) => {
    e.preventDefault();
    if (!jdText.trim()) {
      setError('Please paste or type the Job Description text');
      return;
    }

    setError('');
    setSuccessMessage('');
    setUploadingJd(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/jd/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: jdText, title: jdTitle.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to parse Job Description');

      setParsedJd(data.jd);
      setJdText('');
      setJdTitle('');
      setSuccessMessage('Job Description analyzed and saved successfully!');
    } catch (err) {
      setError(err.message || 'Error saving Job Description. Please try again.');
    } finally {
      setUploadingJd(false);
    }
  };

  const handleDeleteJd = async () => {
    if (!window.confirm('Are you sure you want to remove this Job Description? You will be able to upload a new one.')) {
      return;
    }
    setError('');
    setSuccessMessage('');
    setDeletingJd(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/jd/latest`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      let data = {};
      try { data = await response.json(); } catch (e) {}
      if (!response.ok) throw new Error(data.message || 'Failed to remove Job Description');

      setParsedJd(null);
      setJdFile(null);
      setSuccessMessage('Job Description removed.');
    } catch (err) {
      setError(err.message || 'Error removing Job Description.');
    } finally {
      setDeletingJd(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Dashboard
          </button>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        <div className="docket-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem' }}>Upload Job Description (JD)</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '65ch', fontSize: '0.92rem' }}>
              Upload a job description PDF or paste the role requirements. InterviewIQ extracts required skills and responsibilities to tailor your interview questions directly to the position.
            </p>
          </div>
          <button
            onClick={() => navigate('/interview')}
            className="btn btn-seal"
            style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
          >
            Start Interview →
          </button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {successMessage && (
          <div className="paper" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={16} /> {successMessage}
          </div>
        )}

        {/* Input Mode Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setJdMode('text')}
            className={`btn btn-secondary ${jdMode === 'text' ? 'active' : ''}`}
            style={{
              width: 'auto',
              padding: '0.6rem 1.35rem',
              fontSize: '0.85rem',
              backgroundColor: jdMode === 'text' ? 'var(--bg-surface-hover)' : 'transparent',
              borderColor: jdMode === 'text' ? 'var(--primary)' : 'var(--border-color)',
              color: jdMode === 'text' ? 'var(--ink)' : 'var(--ink-secondary)',
            }}
          >
            ✍️ Paste JD Text
          </button>
          <button
            type="button"
            onClick={() => setJdMode('pdf')}
            className={`btn btn-secondary ${jdMode === 'pdf' ? 'active' : ''}`}
            style={{
              width: 'auto',
              padding: '0.6rem 1.35rem',
              fontSize: '0.85rem',
              backgroundColor: jdMode === 'pdf' ? 'var(--bg-surface-hover)' : 'transparent',
              borderColor: jdMode === 'pdf' ? 'var(--primary)' : 'var(--border-color)',
              color: jdMode === 'pdf' ? 'var(--ink)' : 'var(--ink-secondary)',
            }}
          >
            📄 Upload JD PDF
          </button>
        </div>

        {/* Option A: Paste Text Mode */}
        {jdMode === 'text' && (
          <div className="paper" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="jd-title">Target Role / Job Title (Optional)</label>
              <input
                id="jd-title"
                type="text"
                className="form-input"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
                placeholder="e.g. Senior Backend Engineer, Full-Stack Developer"
                disabled={uploadingJd}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="jd-text">Job Description Content *</label>
              <textarea
                id="jd-text"
                className="form-input"
                rows={7}
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job requirements, responsibilities, and required tech stack here…"
                disabled={uploadingJd}
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveJdText}
              className="btn btn-primary"
              disabled={uploadingJd || !jdText.trim()}
              style={{ width: 'auto', padding: '0.75rem 2rem' }}
            >
              {uploadingJd ? <Spinner size={16} /> : <Briefcase size={16} />}
              {uploadingJd ? 'Analyzing Job Description…' : 'Analyze & Save Job Description'}
            </button>
          </div>
        )}

        {/* Option B: PDF Mode */}
        {jdMode === 'pdf' && (
          <div className="paper" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="jd-pdf-role">
                Target Role to Focus On (Optional)
              </label>
              <input
                id="jd-pdf-role"
                type="text"
                className="form-input"
                value={jdTitle}
                onChange={(e) => setJdTitle(e.target.value)}
                placeholder="e.g. Backend Engineer, Senior DevOps (recommended if PDF has multiple positions)"
                disabled={uploadingJd}
              />
              <p style={{ color: 'var(--ink-secondary)', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                If your PDF covers multiple job openings or roles, enter the target title to direct the AI parser to that specific position.
              </p>
            </div>

            <div
              className={`evidence-dropzone ${jdDragActive ? 'drag-active' : ''}`}
              onDragEnter={handleJdDrag}
              onDragLeave={handleJdDrag}
              onDragOver={handleJdDrag}
              onDrop={handleJdDrop}
            >
              <input
                id="jd-file-upload"
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) validateAndSetJdFile(e.target.files[0]);
                }}
                style={{ display: 'none' }}
              />

              <label htmlFor="jd-file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <Upload size={28} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />

                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                  {jdFile ? jdFile.name : 'Drag & drop your Job Description PDF here'}
                </h3>
                <p style={{ color: 'var(--ink-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                  {jdFile ? `${(jdFile.size / 1024 / 1024).toFixed(2)} MB PDF selected` : 'or click to browse from your device (PDF up to 10MB)'}
                </p>
              </label>

              {jdFile && (
                <button
                  type="button"
                  onClick={handleUploadJdPdf}
                  className="btn btn-primary"
                  disabled={uploadingJd}
                  style={{ maxWidth: '280px', margin: '0 auto' }}
                >
                  {uploadingJd ? <Spinner size={15} /> : <Upload size={15} />}
                  {uploadingJd ? 'Analyzing JD…' : 'Upload Job Description PDF'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Parsed Job Description Preview */}
        {loadingJd ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading Job Description…</p>
        ) : parsedJd ? (
          <div className="paper" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Briefcase size={22} style={{ color: 'var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                    {parsedJd.parsedData?.roleTitle || parsedJd.title || 'Job Description Ready'}
                  </h2>
                  <p style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem' }}>
                    {parsedJd.filename || 'Pasted Job Description'}
                    {parsedJd.parsedData?.experienceLevel && ` · ${parsedJd.parsedData.experienceLevel}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleDeleteJd}
                  className="btn btn-secondary"
                  disabled={deletingJd}
                  style={{ width: 'auto', padding: '0.7rem 1.1rem', color: 'var(--seal)' }}
                  title="Remove this Job Description"
                >
                  {deletingJd ? <Spinner size={15} /> : <Trash size={15} />}
                  {deletingJd ? 'Removing…' : 'Remove JD'}
                </button>
                <button
                  onClick={() => navigate('/interview')}
                  className="btn btn-seal"
                  style={{ width: 'auto', padding: '0.7rem 1.5rem' }}
                >
                  Start Interview →
                </button>
              </div>
            </div>

            {/* Summary */}
            {parsedJd.parsedData?.summary && (
              <p style={{ color: 'var(--ink)', fontSize: '0.92rem', marginBottom: '1.25rem', fontStyle: 'italic' }}>
                "{parsedJd.parsedData.summary}"
              </p>
            )}

            {/* Required Skills */}
            {parsedJd.parsedData?.requiredSkills && parsedJd.parsedData.requiredSkills.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                  Required Tech Stack &amp; Competencies
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {parsedJd.parsedData.requiredSkills.map((skill, idx) => (
                    <span key={idx} className="exhibit-tag" style={{ borderColor: 'var(--primary)', color: 'var(--primary-ink)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Responsibilities */}
            {parsedJd.parsedData?.responsibilities && parsedJd.parsedData.responsibilities.length > 0 && (
              <div>
                <h3 style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                  Key Responsibilities &amp; Evaluation Focus
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {parsedJd.parsedData.responsibilities.map((resp, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--ink-secondary)' }}>
                      <Check size={14} style={{ color: 'var(--success)', marginTop: '0.2rem', flexShrink: 0 }} />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default JobDescriptionUpload;
