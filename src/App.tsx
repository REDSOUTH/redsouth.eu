import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { Auth } from "@/pages/Auth";
import { Account } from "@/pages/Account";
import { LauncherAuth } from "@/pages/LauncherAuth";
import { Legal } from "@/pages/Legal";
import { Contact } from "@/pages/Contact";
import { Projects } from "@/pages/Projects";
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuthStore();
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }
  if (!firebaseUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/legal/:document" element={<Legal />} />
          <Route path="/blog" element={<BlogList />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/projects" element={<Projects />} />

          {/* Firebase Auth & Onboarding */}
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/forgot-password" element={<Auth />} />

          {/* Legacy route aliases */}
          <Route path="/auth/signin" element={<Navigate to="/login" replace />} />
          <Route path="/auth/signup" element={<Navigate to="/register" replace />} />
          <Route path="/auth/reset-password" element={<Navigate to="/forgot-password" replace />} />

          {/* ONE Launcher Authorization Bridge */}
          <Route path="/auth/launcher" element={<LauncherAuth />} />

          {/* Account Dashboard */}
          <Route
            path="/account/:tab?"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/:tab?"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
