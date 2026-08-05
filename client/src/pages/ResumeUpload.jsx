import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [parsedResume, setParsedResume] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  // Load existing resume if present
  useEffect(() => {
    const fetchLatestResume = async () => {
      try {
        const response = await fetch('/api/resume/latest', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
      const selected = e.dataTransfer.files[0];
      validateAndSetFile(selected);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
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
    setUploading(true);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to parse resume');
      }

      setParsedResume(data.resume);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Error uploading resume. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar">
        <Link to="/dashboard" className="auth-brand" style={{ marginBottom: 0 }}>
          Interview<span>IQ</span>
        </Link>
        <div className="nav-user">
          <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
            Dashboard
          </button>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Resume Deep Dive Setup
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Upload your technical resume. InterviewIQ will extract your projects and skills to tailor your custom adaptive interview session.
          </p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        {/* Upload Box */}
        <div
          className="auth-card"
          style={{
            maxWidth: '100%',
            marginBottom: '2rem',
            border: dragActive ? '2px dashed var(--primary)' : '1px dashed var(--border-color)',
            backgroundColor: dragActive ? 'rgba(108, 99, 255, 0.05)' : 'var(--bg-surface)',
            textAlign: 'center',
            cursor: 'pointer',
            padding: '3rem 2rem',
            transition: 'all 0.2s ease',
          }}
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
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 1rem auto',
                borderRadius: '50%',
                backgroundColor: 'rgba(108, 99, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary)',
                fontSize: '1.75rem',
              }}
            >
              📄
            </div>

            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              {file ? file.name : 'Drag & drop your PDF resume here'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
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
              {uploading ? 'Parsing AI Resume...' : 'Analyze Resume'}
            </button>
          )}
        </div>

        {/* Parsed Resume Preview */}
        {loadingExisting ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading resume details...</p>
        ) : parsedResume ? (
          <div className="auth-card" style={{ maxWidth: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Extracted Resume Intelligence
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Source: <strong>{parsedResume.filename}</strong>
                </p>
              </div>
              <button
                onClick={() => navigate('/interview')}
                className="btn btn-primary"
                style={{ width: 'auto', padding: '0.75rem 1.75rem' }}
              >
                Start Adaptive Interview →
              </button>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Extracted Skills
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {parsedResume.parsedData?.skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'rgba(0, 212, 170, 0.1)',
                      border: '1px solid rgba(0, 212, 170, 0.3)',
                      color: 'var(--secondary)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '20px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <h3 style={{ fontSize: '1rem', color: 'var(--primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Extracted Projects for Deep-Dive
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                {parsedResume.parsedData?.projects?.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                    }}
                  >
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {proj.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                      {proj.description}
                    </p>
                    {proj.techStack && proj.techStack.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {proj.techStack.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              background: 'var(--bg-surface)',
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
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
