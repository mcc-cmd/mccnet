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
import { DiscardedDocuments } from '@/pages/DiscardedDocuments';
import { OtherCompletions } from '@/pages/OtherCompletions';
import { SubmitApplication } from '@/pages/SubmitApplication';
import { Downloads } from '@/pages/Downloads';
import { AdminPanel } from '@/pages/AdminPanel';
import { Settlements } from '@/pages/Settlements';
import { TestPage } from '@/pages/TestPage';
import WorkRequests from '@/pages/WorkRequests';
import NotFound from '@/pages/not-found';
import SalesTeamManagement from '@/pages/SalesTeamManagement';

import SalesManagerDashboard from '@/pages/SalesManagerDashboard';

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
      <Route path="/discarded" component={DiscardedDocuments} />
      <Route path="/other-completions" component={OtherCompletions} />
      <Route path="/downloads" component={Downloads} />
      {user?.userType === 'admin' && (
        <Route path="/settlements" component={Settlements} />
      )}

      {user?.userType === 'admin' && (
        <>
          <Route path="/admin" component={AdminPanel} />
          <Route path="/sales-team-management" component={SalesTeamManagement} />
          <Route path="/test" component={TestPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

// 영업과장 전용 라우터 (인증 없이 접근 가능)
function SalesManagerRoutes() {
  return (
    <Switch>
      <Route path="/sales-manager-login" component={SalesManagerLogin} />
      <Route path="/sales-manager-dashboard" component={SalesManagerDashboard} />
      <Route component={() => <Redirect to="/sales-manager-login" />} />
    </Switch>
  );
}

// 메인 앱 라우터
function MainApp() {
  return (
    <Switch>
      {/* 영업과장 대시보드 (인증 우회) */}
      <Route path="/sales-manager-dashboard" component={SalesManagerDashboard} />
      
      {/* 기존 인증이 필요한 라우트 */}
      <Route>
        <AuthGuard fallback={<Login />}>
          <AppRoutes />
        </AuthGuard>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
      <Toaster />
    </QueryClientProvider>
  );
}
