import { Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Documents } from '@/pages/Documents';
import { SubmitApplication } from '@/pages/SubmitApplication';
import { Downloads } from '@/pages/Downloads';
import { AdminPanel } from '@/pages/AdminPanel';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/submit" component={SubmitApplication} />
      <Route path="/documents" component={Documents} />
      <Route path="/downloads" component={Downloads} />
      {user?.userType === 'admin' && (
        <Route path="/stats" component={() => <div>통계 페이지 (개발 중)</div>} />
      )}
      {user?.userType === 'admin' && (
        <Route path="/admin" component={AdminPanel} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard fallback={<Login />}>
        <AppRoutes />
      </AuthGuard>
      <Toaster />
    </QueryClientProvider>
  );
}
