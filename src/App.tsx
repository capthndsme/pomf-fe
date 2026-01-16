import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import Topbar from "@/components/Topbar";
import FullsizeSpinner from "@/components/FullsizeSpinner";
import { useAuth } from "@/providers/AuthProvider";
import { AttachmentViewerProvider } from "@/providers/AttachmentViewerProvider";

const Landing = lazy(() => import("@/screens/Landing"));
const Protected = lazy(() => import("@/screens/Protected"));
const ShareLink = lazy(() => import("@/screens/ShareLink"));
const StatusPage = lazy(() => import("@/screens/StatusPage"));
const Login = lazy(() => import("@/screens/Login"));
const Register = lazy(() => import("@/screens/Register"));
const MyFiles = lazy(() => import("@/screens/MyFiles"));

const FolderShareRedirect = () => {
  const { shareId } = useParams<{ shareId: string }>();
  return <Navigate to={`/s/${shareId ?? ""}`} replace />;
};

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <FullsizeSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AttachmentViewerProvider>
        <Topbar />
        <Suspense fallback={<FullsizeSpinner />}>
          <Routes>
            {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/s/:id" element={<ShareLink />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Back-compat: old folder-share route redirects to canonical /s/:id surface */}
          <Route path="/folder/:shareId" element={<FolderShareRedirect />} />

          {/* Protected routes */}
          <Route
            path="/my-files"
            element={
              <ProtectedRoute>
                <MyFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-files/:folderId"
            element={
              <ProtectedRoute>
                <MyFiles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <Protected />
              </ProtectedRoute>
            }
          />
                  </Routes>
                </Suspense>
              </AttachmentViewerProvider>
            </BrowserRouter>
          );
        }
export default App;
