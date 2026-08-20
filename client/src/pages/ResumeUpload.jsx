import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { Upload, FileText, Trash, Spinner, Check } from '../components/Icon';
import { API_BASE_URL } from '../config/api';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingResume, setDeletingResume] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [parsedResume, setParsedResume] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestResume = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/resume/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setParsedResume(data.resume);
        }
      } catch (err) {
        console.error('Error fetching existing resume:', err);
      } finally {
        setLoadingExisting(false);
      }
    };

    if (token) {
      fetchLatestResume();
    }
  }, [token]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    setSuccessMessage('');
    if (!selectedFile.name.endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      setError('Please select a valid PDF file (.pdf)');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit');
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file first');
      return;
    }

    setError('');
    setSuccessMessage('');
    setUploading(true);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to parse resume');
      }

      setParsedResume(data.resume);
      setFile(null);
      setSuccessMessage('Resume parsed and saved successfully!');
    } catch (err) {
      setError(err.message || 'Error uploading resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove this resume? You will be able to upload a new one.')) {
      return;
    }
    setError('');
    setSuccessMessage('');
    setDeletingResume(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/resume/latest`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        /* ignore JSON parse error on non-200 html */
      }
      if (!response.ok) {
        throw new Error(data.message || `Failed to remove resume (status ${response.status})`);
      }
      setParsedResume(null);
      setFile(null);
      setSuccessMessage('Resume removed successfully.');
    } catch (err) {
      setError(err.message || 'Error removing resume. Please try again.');
    } finally {
      setDeletingResume(false);
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
            <h1 style={{ fontSize: '1.6rem' }}>Upload Resume</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem', maxWidth: '65ch', fontSize: '0.92rem' }}>
              Upload your resume so InterviewIQ can extract your projects and skills to build a personalised interview — one project gets a full deep dive.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/jd')}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.75rem 1.25rem', fontSize: '0.85rem' }}
            >
              Upload JD Instead →
            </button>
            <button
              onClick={() => navigate('/interview')}
              className="btn btn-seal"
              style={{ width: 'auto', padding: '0.75rem 1.5rem', fontSize: '0.85rem' }}
            >
              Start Interview →
            </button>
          </div>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: '1.25rem' }}>{error}</div>}
        {successMessage && (
          <div className="paper" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', borderColor: 'var(--success)', color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Check size={16} /> {successMessage}
          </div>
        )}

        {/* Dropzone */}
        <div
          className={`evidence-dropzone ${dragActive ? 'drag-active' : ''}`}
          style={{ marginBottom: '2rem' }}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleChange}
            style={{ display: 'none' }}
          />

          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
            <Upload size={28} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />

            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: 'var(--ink)', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              {file ? file.name : 'Drag & drop your PDF resume here'}
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB PDF selected` : 'or click to browse from your device (PDF up to 10MB)'}
            </p>
          </label>

          {file && (
            <button
              onClick={handleUpload}
              className="btn btn-primary"
              disabled={uploading}
              style={{ maxWidth: '240px', margin: '0 auto' }}
            >
              {uploading ? <Spinner size={15} /> : <Upload size={15} />}
              {uploading ? 'Analyzing Resume…' : 'Upload Resume'}
            </button>
          )}
        </div>

        {/* Parsed Resume Preview */}
        {loadingExisting ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading your resume…</p>
        ) : parsedResume ? (
          <div className="paper" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Resume Ready
                  </h2>
                  <p style={{ color: 'var(--ink-secondary)', fontSize: '0.85rem' }}>
                    {parsedResume.filename}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleDeleteResume}
                  className="btn btn-secondary"
                  disabled={deletingResume}
                  style={{ width: 'auto', padding: '0.7rem 1.1rem', color: 'var(--seal)', borderColor: 'var(--border-color)' }}
                  title="Remove this resume and upload a new one"
                >
                  {deletingResume ? <Spinner size={15} /> : <Trash size={15} />}
                  {deletingResume ? 'Removing…' : 'Remove Resume'}
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

            {/* Skills */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {parsedResume.parsedData?.skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="exhibit-tag"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--ink-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                Projects for Deep Dive
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                {parsedResume.parsedData?.projects?.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderBottom: idx < parsedResume.parsedData.projects.length - 1 ? '1px solid var(--border-color)' : 'none',
                      padding: '1rem 1.1rem',
                    }}
                  >
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.35rem' }}>
                      {proj.name}
                    </h4>
                    <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                      {proj.description}
                    </p>
                    {proj.techStack && proj.techStack.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {proj.techStack.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              color: 'var(--ink-muted)',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.72rem',
                              padding: '0.1rem 0.4rem',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default ResumeUpload;
