import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./providers/AuthProvider.tsx";
import { CurrentServerProvider } from "./providers/CurrentServerProvider.tsx";
import { QueryClientProvider } from "react-query";
import { queryClient } from "./queryClient.ts";
import { HelmetProvider } from "react-helmet-async";
import { UploaderProvider } from "./providers/UploaderProvider.tsx";

createRoot(document.getElementById("root")!).render(
   <StrictMode>
      <HelmetProvider>
         <QueryClientProvider client={queryClient}>
            <AuthProvider>
               <CurrentServerProvider>
                  <UploaderProvider>
                     <App />
                  </UploaderProvider>
               </CurrentServerProvider>
            </AuthProvider>
         </QueryClientProvider>
      </HelmetProvider>
   </StrictMode>
);
