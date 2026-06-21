// NOTE: This is a reconstruction, not a diff of your actual App.jsx — I
// don't have that file's real contents. Merge this routing structure
// with whatever your real Login/Signup imports and any existing
// guard/wrapper components actually look like. The part that matters is
// the new block: Dashboard/Goals/Roadmaps/Tasks all nested under one
// <Layout /> parent route instead of being standalone routes.

import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Goals from './pages/Goals';
import Roadmaps from './pages/Roadmaps';
import Tasks from './pages/Tasks';
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
      </Route>
    </Routes>
  );
}
