import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Cursor } from './components/Cursor';
import AuthGuard from './components/AuthGuard';

import { UserProvider } from './pages/dashboard/UserContext';

import Home from './pages/Home';
import ErrorPage from './pages/ErrorPage';
import Ineligible from './pages/Ineligible';

import DashboardLayout from './pages/dashboard/Layout';
import DashboardAccount from './pages/dashboard/Account';
import DashboardProjects from './pages/dashboard/Projects';
import DashboardShop from './pages/dashboard/Shop';

import Admin from './pages/dashboard/Admin';

function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Cursor />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ineligible" element={<Ineligible />} />

          <Route path="/dashboard" element={<AuthGuard />}>
            <Route index element={<Navigate to="/dashboard/projects" replace />} />

            <Route element={<DashboardLayout />}>
              <Route path="account" element={<DashboardAccount />} />
              <Route path="projects" element={<DashboardProjects />} />
              <Route path="shop" element={<DashboardShop />} />
              <Route path="admin" element={<Admin />} />
            </Route>

          </Route>
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
}

export default App;