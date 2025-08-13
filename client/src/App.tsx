import { useEffect, useState } from 'react';
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

// 판매점 관련 페이지
import { DealerRegistration } from '@/pages/DealerRegistration';
import { DealerLogin } from '@/pages/DealerLogin';
import { DealerDashboard } from '@/pages/DealerDashboard';
import { DealerChat } from '@/pages/DealerChat';
import { DealerApplications } from '@/pages/DealerApplications';
import { DealerWorkRequests } from '@/pages/DealerWorkRequests';
import { DealerCompletedManagement } from '@/pages/DealerCompletedManagement';
import { DealerOtherCompleted } from '@/pages/DealerOtherCompleted';
import { DealerCancelledHistory } from '@/pages/DealerCancelledHistory';

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
  const { isAuthenticated, user, checkAuth, sessionId } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('App init: Starting auth check');
      
      // localStorage에서 sessionId 확인하고 인증 상태 복원
      const storedSessionId = localStorage.getItem('sessionId');
      if (storedSessionId || sessionId) {
        console.log('App init: Found sessionId, checking auth');
        await checkAuth();
      } else {
        console.log('App init: No sessionId found');
      }
      
      setIsLoading(false);
    };
    initAuth();
  }, []); // 빈 배열로 변경하여 마운트 시에만 실행

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // 미인증 상태에서는 로그인 페이지 표시 (단, 판매점 관련 페이지 제외)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/dealer-registration" component={DealerRegistration} />
        <Route path="/dealer-login" component={DealerLogin} />
        <Route component={Login} />
      </Switch>
    );
  }

  // 영업과장은 실적 대시보드로 리다이렉트
  if (user?.userType === 'sales_manager') {
    return (
      <Switch>
        <Route path="/" component={() => <Redirect to="/sales-manager-dashboard" />} />
        <Route path="/sales-manager-dashboard" component={SalesManagerDashboard} />
        <Route component={() => <Redirect to="/sales-manager-dashboard" />} />
      </Switch>
    );
  }

  // 판매점과 근무자는 판매점 전용 대시보드로 리다이렉트
  if (user?.userType === 'dealer' || (user?.userType === 'user' && user?.role === 'dealer_worker')) {
    return (
      <Switch>
        <Route path="/" component={() => <Redirect to="/dealer" />} />
        <Route path="/dealer" component={DealerDashboard} />
        <Route path="/dealer/submit-application" component={SubmitApplication} />
        <Route path="/dealer/applications" component={DealerApplications} />
        <Route path="/dealer/work-requests" component={DealerWorkRequests} />
        <Route path="/dealer/completed" component={DealerCompletedManagement} />
        <Route path="/dealer/other-completed" component={DealerOtherCompleted} />
        <Route path="/dealer/cancelled" component={DealerCancelledHistory} />
        <Route path="/dealer-chat/:documentId" component={DealerChat} />
        <Route component={() => <Redirect to="/dealer" />} />
      </Switch>
    );
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
      <Route path="/sales-manager-dashboard" component={SalesManagerDashboard} />
      <Route component={() => <Redirect to="/sales-manager-dashboard" />} />
    </Switch>
  );
}

// 메인 앱 라우터
function MainApp() {
  return (
    <Switch>
      {/* 판매점 관련 페이지 (인증 우회) */}
      <Route path="/dealer-registration" component={DealerRegistration} />
      <Route path="/dealer-login" component={DealerLogin} />
      
      {/* 판매점 전용 라우트 (인증 우회) */}
      <Route path="/dealer" component={DealerDashboard} />
      <Route path="/dealer/submit-application" component={SubmitApplication} />
      <Route path="/dealer/applications" component={DealerApplications} />
      <Route path="/dealer/work-requests" component={DealerWorkRequests} />
      <Route path="/dealer/completed" component={DealerCompletedManagement} />
      <Route path="/dealer/other-completed" component={DealerOtherCompleted} />
      <Route path="/dealer/cancelled" component={DealerCancelledHistory} />
      <Route path="/dealer-chat/:documentId" component={DealerChat} />
      
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
