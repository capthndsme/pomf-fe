import RenderPreview from "@/components/RenderPreview";
import { TouchableLink } from "@/components/TouchableLink";

import { BRANDING } from "@/constants";
import { useResolveLinkToFile } from "@/hooks/useResolveLinkToFile";
import { Loader2 } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";

const ShareLink = () => {
   const { id } = useParams();
   const data = useResolveLinkToFile(id ?? "");
   const file = data.data;
   if (data.isLoading) {
      return <Loader2 className="animate-spin h-5 w-5" />;
   }

   if (data.isError) {
      return <div>Not found</div>;
   }

   if (!file) {
      return <div>File not found.</div>;
   }

   return (
      <>
         <Helmet>
            <title>
               {file.originalFileName} - {BRANDING ?? "pomfd"}
            </title>
         </Helmet>
         <div className="w-full max-w-5xl mx-auto p-2 pt-4" style={{

         }}>
            <h1 className="text-2xl font-bold mb-4">File Details</h1>
            <div className="bg-blue-950 rounded-lg p-4 text-white">
               <p className="text-lg font-semibold mb-2">Original Filename: {file.originalFileName}</p>
               <p className="mb-2">Size: {((file.fileSize ?? 0) / 1024 / 1024).toFixed(2)} MB</p>
               <p className="mb-2">
                  Uploaded At: {new Date(file.createdAt).toLocaleString()}
                  <br />
                  Stored in: {file.serverShard?.domain}
                  <br />
                  Mime Type: {file.mimeType}
               </p>
               {file.fileKey && file.serverShard?.domain && (
                  <>
                     <p>
                        Direct Link:{" "}
                        <a
                           href={`https://${file.serverShard.domain}/${file.fileKey}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="text-blue-400 hover:underline"
                        >
                           {`https://${file.serverShard.domain}/${file.fileKey}`}
                        </a>
                     </p>
                     <TouchableLink
                        to={`https://${file.serverShard.domain}/${file.fileKey}`}
                        download
                        className="inline-block mb-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md mt-4"
                     >
                        Download File
                     </TouchableLink>

                     <RenderPreview item={file} />
                  </>
               )}
            </div>
         </div>
      </>
   );
};

export default ShareLink;
