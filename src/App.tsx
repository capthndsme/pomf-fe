import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
 

const Landing = lazy(() => import("@/screens/Landing"))

function App() {
   return (
      <BrowserRouter>
         <Routes>
          <Route Component={Landing} path="/" />
         </Routes>
      </BrowserRouter>
   );
}

export default App;
