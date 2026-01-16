import { useCurrentServer } from "@/providers/CurrentServerProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useUploader } from "../providers/UploaderProvider";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Uploader } from "@/components/Uploader";
import UUIDService from "@/components/UUIDService";
import { TouchableLink } from "@/components/TouchableLink";
import { BRANDING } from "@/constants";
import { buildPublicViewUrls } from "@/lib/fileViewUrls";

const Landing = () => {
   const serversApi = useCurrentServer();
   const { isAuthenticated } = useAuth();

   const [saveToHistory, setSaveToHistory] = useState<boolean>(() => {
      return localStorage.getItem('save_to_history') === 'true';
   });

   const toggleSaveToHistory = () => {
      const newValue = !saveToHistory;
      setSaveToHistory(newValue);
      if (newValue) {
         localStorage.setItem('save_to_history', 'true');
      } else {
         localStorage.removeItem('save_to_history');
      }
   };

   const [serverLatency, setServerLatency] = useState<number>(0);
   useEffect(() => {
      const loop = () => {
         if (serversApi.currentServer) {
            const startTime = Date.now();
            fetch(`https://${serversApi.currentServer.domain}/`)
               .then(() => {
                  setServerLatency(Date.now() - startTime);
               })
               .catch(() => {
                  setServerLatency(-1); // Indicate error
               });
         }
      };

      setTimeout(() => loop(), 500);
      const looper = setInterval(loop, 3000);

      return () => clearInterval(looper);
   }, [serversApi?.currentServer?.domain]);
   const { uploadedFiles } = useUploader();

   return (
      <>
         <Helmet>
            <title>{BRANDING ?? "pomfd"} - upload</title>
         </Helmet>

         <div className="w-full max-w-5xl mx-auto p-2 pt-16">
            <div className="my-4 flex flex-row-reverse">
               <div className="flex items-center gap-4">
                  <div>Server Selection</div>
                  <select
                     className="p-2 rounded-md bg-blue-800 text-white"
                     value={serversApi.currentServer?.id ?? ""}
                     onChange={(e) => {
                        const selectedServer = serversApi.serverList?.find((s) => s.id === Number(e.target.value));
                        if (selectedServer) {
                           console.log("setCurrentServer", selectedServer);
                           serversApi.setCurrentServer(selectedServer);
                        }
                     }}
                  >
                     {serversApi.serverList?.map((server) => (
                        <option key={server.id} value={server.id}>
                           {server.domain}
                        </option>
                     ))}
                  </select>
                  <div>
                     {serverLatency}ms - {((serversApi.currentServer?.spaceFree ?? 0) / 1024 / 1024).toFixed(2)} GB free
                  </div>
               </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
               <div className="w-full md:w-1/3 bg-blue-950 rounded-lg p-4 text-white">
                  <h2 className="text-2xl mb-4 font-light">Anonymous Uploader</h2>

                  {isAuthenticated && (
                     <div className="flex items-center gap-2 mb-4">
                        <input
                           type="checkbox"
                           id="saveToHistory"
                           checked={saveToHistory}
                           onChange={toggleSaveToHistory}
                           className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="saveToHistory" className="text-sm font-medium text-gray-200 select-none cursor-pointer">
                           Save to history
                        </label>
                     </div>
                  )}

                  <Uploader uploadOptions={{ saveToHistory: saveToHistory && isAuthenticated }} />
               </div>

               {/* Right Column */}
               <div className="w-full md:w-2/3 bg-blue-950 rounded-lg p-4 text-white">
                  <h2 className="text-2xl font-light mb-4">Current uploads</h2>
                  {uploadedFiles.map((file) => {
                     const urls = buildPublicViewUrls(file);
                     const directUrl = urls?.originalUrl ?? null;
                     const sharePath = `/s/${UUIDService.encode(file.id)}`;

                     return (
                        <div key={file.id} className="mb-4 bg-blue-800/30 px-2 py-1 rounded-md">
                           <p className="text-lg font-semibold">{file.originalFileName}</p>
                           <a
                              href={directUrl ?? undefined}
                              target="_blank"
                              className="text-blue-400 hover:underline block py-2"
                           >
                              Direct: {directUrl ?? "(unavailable)"}
                           </a>
                           <TouchableLink
                              to={directUrl ? sharePath : undefined}
                              target="_blank"
                              className="text-blue-400 hover:underline block py-2"
                           >
                              Web Link
                           </TouchableLink>
                        </div>
                     );
                  })}
               </div>
            </div>
            <div className=" mt-4 text-sm text-center font-light opacity-70">
               <div className="">pomfd by @capthndsme (c) 2025</div>
               <TouchableLink to="/status" className="inline-block p-2  text-blue-400">Status</TouchableLink>
               <div className="pt-2">microservices:</div>
               <div className="items-center justify-center flex-row flex">
                  <TouchableLink to="https://github.com/capthndsme/pomfd-api" target="_blank" className="inline-block p-2 pt-0  text-blue-400">
                     api
                  </TouchableLink>
                  <TouchableLink to="https://github.com/capthndsme/pomfd-serve" target="_blank" className="inline-block p-2 pt-0 text-blue-400">
                     serve
                  </TouchableLink>
                  <TouchableLink to="https://github.com/capthndsme/pomfd-serve" target="_blank" className="inline-block p-2 pt-0 text-blue-400">
                     transcoder
                  </TouchableLink>
                  <TouchableLink to="https://github.com/capthndsme/pomfd-fe" target="_blank" className="inline-block p-2 pt-0  text-blue-400">
                     frontend
                  </TouchableLink>
               </div>
            </div>
         </div>
      </>
   );
};

export default Landing;
