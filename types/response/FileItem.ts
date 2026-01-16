import { type FileType } from "../FileType";
import User from "../User";
import ServerShard from "./ServerShard";

/** NOTE: This is a DTO basically, as this si  */

/**
 * example return data
 {
    "data": {
        "id": "0e4b3127-2d58-44f8-af90-c729d720825d",
        "createdAt": "2025-07-05T03:25:20.000+08:00",
        "updatedAt": "2025-07-09T05:02:22.000+08:00",
        "ownerId": null,
        "parentFolder": null,
        "name": "VID_20140620_165942.mp4",
        "description": null,
        "isPrivate": 0,
        "isFolder": 0,
        "originalFileName": "VID_20140620_165942.mp4",
        "mimeType": "video/mp4",
        "fileType": "VIDEO",
        "fileKey": "ajo5qLPrpKWen_H9YY/VID_20140620_165942.mp4",
        "previewKey": "ajo5qLPrpKWen_H9YY/VID_20140620_165942.mp4_thumbnail.jpg_Thumb.jpg",
        "previewBlurHash": "UUIX]d.800NG~qxuD%WB00IU?bxuIUM{t7t7",
        "serverShardId": 160,
        "fileSize": 10602361,
        "replicationParent": null,
        "itemWidth": 640,
        "itemHeight": 480,
        "transcodeStatus": "finished",
        "transcodeStartedAt": "2025-07-09T05:02:22.000+08:00",
        "serverShard": {
        not relevant-ish
        },
        "replicas": [
        ],
        "previews": [
            {
                "id": "05996393-d3cc-419a-bd49-74a0a643501c",
                "fileItemId": "0e4b3127-2d58-44f8-af90-c729d720825d",
                "previewKey": "ajo5qLPrpKWen_H9YY/VID_20140620_165942.mp4_480p.mp4", 
                "mimeType": "video/mp4",
                "quality": "480",
                "createdAt": "2025-07-09T05:02:22.000+08:00",
                "updatedAt": "2025-07-09T05:02:22.000+08:00"
            }
        ]
    },
    "status": "success",
    "message": "File found"
}
 */
export default class FileItem {
   declare id: string;
   /** Uuid generation */

   declare createdAt: string;

   declare updatedAt: string;

   declare ownerId: string;

   declare parentFolder: string | null;

   declare name: string;

   declare itemWidth: number | null
   declare itemHeight: number | null

   declare description: string | null;

   declare isPrivate: boolean | null;

   declare isFolder: boolean;

   declare originalFileName: string | null;

   declare mimeType: string | null;

   declare fileType: FileType | null;

   declare fileKey: string | null;

   declare previewKey: string | null;

   declare previewBlurHash: string | null;

   declare serverShardId: number | null;

   declare fileSize: number | null;

   // Original file: replicationParent = null
   // Replica: points to original's UUID

   declare replicationParent: string | null;

   declare user: User | null;

   declare serverShard: ServerShard | null;

   declare parent: FileItem | null;

   declare children: FileItem[];

   declare replicas: FileItem[];

   declare previews: Array<{
      previewKey: string;
      mimeType: string;
      quality: "480" | "720" | "1080";
   }>;
}
