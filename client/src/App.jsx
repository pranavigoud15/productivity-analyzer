import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Roadmaps from './pages/Roadmaps';
import Tasks from './pages/Tasks';
import Journals from './pages/Journals';
import Notes from './pages/Notes';
import Layout from './layouts/Layout';

export default function App() {
  return (
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
      </Route>
    </Routes>
  );
}
