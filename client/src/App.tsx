import { Route, Switch, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/lib/auth';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Documents } from '@/pages/Documents';
import { CompletedActivations } from '@/pages/CompletedActivations';
import { CancelledActivations } from '@/pages/CancelledActivations';
import { OtherCompletions } from '@/pages/OtherCompletions';
import { SubmitApplication } from '@/pages/SubmitApplication';
import { Downloads } from '@/pages/Downloads';
import { AdminPanel } from '@/pages/AdminPanel';
import { Settlements } from '@/pages/Settlements';
import { TestPage } from '@/pages/TestPage';
import WorkRequests from '@/pages/WorkRequests';
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
      <Route path="/submit-application" component={SubmitApplication} />
      <Route path="/documents" component={Documents} />
      <Route path="/work-requests" component={WorkRequests} />
      <Route path="/completed" component={CompletedActivations} />
      <Route path="/cancelled" component={CancelledActivations} />
      <Route path="/other-completions" component={OtherCompletions} />
      <Route path="/downloads" component={Downloads} />
      {user?.userType === 'admin' && (
        <Route path="/settlements" component={Settlements} />
      )}

      {user?.userType === 'admin' && (
        <>
          <Route path="/admin" component={AdminPanel} />
          <Route path="/test" component={TestPage} />
        </>
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
