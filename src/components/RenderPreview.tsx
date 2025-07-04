import type FileItem from "../../types/response/FileItem";

const RenderPreview = ({ item }: { item: FileItem }) => {
   switch (item.fileType) {
      case "IMAGE":
         return (
            <img
               src={`https://${item.serverShard?.domain}/${item.fileKey}`}
               className=" bg-black p-2 w-full aspect-[4/3] object-contain rounded-lg"
               alt={item.originalFileName ?? "NA"}
            />
         );
      case "VIDEO":
         return (
            <video controls className=" bg-black p-2 w-full aspect-[4/3] rounded-lg object-contain ">
               <source src={`https://${item.serverShard?.domain}/${item.fileKey}`} type={item.mimeType ?? "video/mp4"} />
               Your browser does not support the video tag.
            </video>
         );
      case "AUDIO":
         return (
            <audio controls className=" bg-black p-2 w-full aspect-[4/3] rounded-lg object-contain ">
               <source src={`https://${item.serverShard?.domain}/${item.fileKey}`} type={item.mimeType ?? "audio/ogg"} />
               Your browser does not support the audio tag.
            </audio>
         );
      case "DOCUMENT":
      case "PLAINTEXT":
         return (
            <iframe
               src={`https://${item.serverShard?.domain}/${item.fileKey}`}
               title={item.originalFileName ?? ""}
               className=" bg-black p-2 w-full aspect-[4/3] rounded-lg object-contain "
            ></iframe>
         );
      default:
         return <p>No preview available for this file type.</p>;
   }
};

export default RenderPreview;
