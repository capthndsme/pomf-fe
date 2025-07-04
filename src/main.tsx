import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./providers/AuthProvider.tsx";
import { CurrentServerProvider } from "./providers/CurrentServerProvider.tsx";
import { QueryClientProvider } from "react-query";
import { queryClient } from "./queryClient.ts";

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <QueryClientProvider client={queryClient}>
         <AuthProvider>
            <CurrentServerProvider>
               <App />
            </CurrentServerProvider>
         </AuthProvider>
      </QueryClientProvider>
   </StrictMode>
);
