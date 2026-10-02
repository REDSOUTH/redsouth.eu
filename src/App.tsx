import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Home } from "@/pages/Home";
import { Auth } from "@/pages/Auth";
import { Account } from "@/pages/Account";
import { Legal } from "@/pages/Legal";
import { Contact } from "@/pages/Contact";
import { Projects } from "@/pages/Projects";
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import { ResetPassword } from "@/pages/ResetPassword";
import { ConfirmEmailChange } from "@/pages/ConfirmEmailChange";
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import { pb } from "@/lib/pb";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (!user && !pb.authStore.isValid) return <Navigate to="/auth/signin" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  if (user || pb.authStore.isValid) return <Navigate to="/account" replace />;
  return <>{children}</>;
}

function App() {
  useEffect(() => {
    // Si hay una sesión guardada localmente, validarla y descargar los datos frescos
    if (pb.authStore.isValid) {
      pb.collection("users").authRefresh().catch((err) => {
        if (err.isAbort) return; // Ignorar el error de cancelación automática en modo desarrollo (React Strict Mode)
        console.error("Error refreshing auth:", err);
        // Si el token expiró (401), fue borrado (404) o no tiene permisos (403)
        if (err.status === 401 || err.status === 404 || err.status === 403) {
          useAuthStore.getState().logout();
        }
      });
    }
  }, []);

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
          <Route 
            path="/auth/signin" 
            element={
              <GuestRoute>
                <Auth />
              </GuestRoute>
            } 
          />
          <Route 
            path="/auth/signup" 
            element={
              <GuestRoute>
                <Auth />
              </GuestRoute>
            } 
          />
          <Route 
            path="/auth/reset-password" 
            element={
              <GuestRoute>
                <ResetPassword />
              </GuestRoute>
            } 
          />
          <Route 
            path="/auth/confirm-email-change" 
            element={
              <ProtectedRoute>
                <ConfirmEmailChange />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/account/:tab?" 
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
