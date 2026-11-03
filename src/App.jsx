import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/common/Layout.jsx';
import { ToastProvider } from './components/common/Toast.jsx';
import { BudgetProvider } from './hooks/useBudget.jsx';
import { ThemeProvider } from './hooks/useTheme.jsx';
import Analytics from './pages/Analytics.jsx';
import Budget from './pages/Budget.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Expenses from './pages/Expenses.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <BudgetProvider>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="budget" element={<Budget />} />
                <Route path="settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </BudgetProvider>
  );
}
