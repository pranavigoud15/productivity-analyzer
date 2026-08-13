import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Roadmaps from './pages/Roadmaps';
import Tasks from './pages/Tasks';
import Journals from './pages/Journals';
import Notes from './pages/Notes';
import MockTests from './pages/Mocktests';
import FocusMode from './pages/FocusMode';
import Layout from './layouts/Layout';
import { FocusProvider } from './context/FocusContext';
import { ThemeProvider } from './context/ThemeContext';
import FloatingTimer from './components/common/FloatingTimer';
import Leaderboard from './pages/Leaderboard';
import Insights from './pages/Insights';
import Assistant from './pages/Assistant';
import Admin from './pages/Admin';

function AdminRoute() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <FocusProvider>
        <FloatingTimer />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/roadmaps" element={<Roadmaps />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/journals" element={<Journals />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/mock-tests" element={<MockTests />} />
            <Route path="/focus" element={<FocusMode />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/assistant" element={<Assistant />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
        </Routes>
      </FocusProvider>
    </ThemeProvider>
  );
}
