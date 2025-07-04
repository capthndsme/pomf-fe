import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Topbar from "@/components/Topbar";
import FullsizeSpinner from "@/components/FullsizeSpinner";

const Landing = lazy(() => import("@/screens/Landing"));
const Protected = lazy(() => import("@/screens/Protected"));
const ShareLink = lazy(() => import("@/screens/ShareLink"));

// a mock auth check
const isAuthenticated = true;

function App() {
  return (
    <BrowserRouter>
      <Topbar />
      <Suspense fallback={<FullsizeSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/s/:id" element={<ShareLink />} />
          {isAuthenticated ? (
            <Route path="/protected" element={<Protected />} />
          ) : null}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
