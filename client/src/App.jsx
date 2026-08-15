import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import InterviewSession from './pages/InterviewSession';
import FinalReport from './pages/FinalReport';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/resume"
            element={
              <PrivateRoute>
                <ResumeUpload />
              </PrivateRoute>
            }
          />
          <Route
            path="/interview"
            element={
              <PrivateRoute>
                <InterviewSession />
              </PrivateRoute>
            }
          />
          <Route
            path="/report/:sessionId?"
            element={
              <PrivateRoute>
                <FinalReport />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
