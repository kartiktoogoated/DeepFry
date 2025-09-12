import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/context/auth-context';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import OauthSuccess from "@/pages/oauth-success";

// Lazy load pages
const LandingPage = lazy(() => import('@/pages/landing'));
const AboutPage = lazy(() => import('@/pages/about'));
const DocsPage = lazy(() => import('@/pages/docs'));
const CryptoPage = lazy(() => import('@/pages/crypto'));
const ClientDashboard = lazy(() => import('@/pages/client-dashboard'));
const LoginPage = lazy(() => import('@/pages/login'));
const SignupPage = lazy(() => import('@/pages/signup'));
const PricingPage = lazy(() => import('./pages/pricing'));
const ValidatorDashboard = lazy(() => import('./pages/validator-dashboard'));
const HowItWorksPage = lazy(() => import('./pages/how-it-works'));

// Loading component
const LoadingSpinner = () => (
  <div className="h-screen w-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LandingPage />
              </Suspense>
            } />
            <Route path="/about" element={
              <Suspense fallback={<LoadingSpinner />}>
                <AboutPage />
              </Suspense>
            } />
            <Route path="/docs" element={
              <Suspense fallback={<LoadingSpinner />}>
                <DocsPage />
              </Suspense>
            } />
            <Route path="/crypto" element={
              <Suspense fallback={<LoadingSpinner />}>
                <CryptoPage />
              </Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<LoadingSpinner />}>
                <LoginPage />
              </Suspense>
            } />
            <Route path="/signup" element={
              <Suspense fallback={<LoadingSpinner />}>
                <SignupPage />
              </Suspense>
            } />
            <Route path="/pricing" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PricingPage />
              </Suspense>
            } />
            <Route path="/how-it-works" element={
              <Suspense fallback={<LoadingSpinner />}>
                <HowItWorksPage />
              </Suspense>
            } />
            <Route path="/validator-dashboard/*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ValidatorDashboard />
              </Suspense>
            } />
            <Route path="/client-dashboard/*" element={
              <Suspense fallback={<LoadingSpinner />}>
                <ClientDashboard />
              </Suspense>
            } />
            <Route path="/oauth-success" element={<OauthSuccess />} />
          </Routes>
        </AuthProvider>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;