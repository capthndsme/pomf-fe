import FullsizeSpinner from "@/components/FullsizeSpinner";
import { useAvailableServers } from "@/hooks/useAvailableServers";
import { createContext, useContext, useState, useMemo, useEffect } from "react";
import type ServerShard from "types/response/ServerShard";

interface CurrentServerContext {
   currentServer: ServerShard | null;
   serverList: ServerShard[] | undefined;
   setCurrentServer: (server: ServerShard) => void;
}

const CurrentServerContext = createContext<CurrentServerContext | undefined>(undefined);

export const CurrentServerProvider = ({ children }: { children: React.ReactNode }) => {
   const [currentServer, setCurrentServer] = useState<ServerShard | null>(null);

   const currentList = useAvailableServers();
   const val = useMemo(
      () => ({
         currentServer,
         serverList: currentList.data,
         setCurrentServer,
      }),
      [currentList?.data?.length, currentList.dataUpdatedAt, currentServer?.id, setCurrentServer]
   );
 
   useEffect(() => {
    if (currentList.data) {
      setCurrentServer(currentList.data[0]);
    }
   }, [!!currentList.data])
   if (!currentList.data) {
      return <FullsizeSpinner  text="Getting config..."/>;
   }

   return <CurrentServerContext.Provider value={val}>{children}</CurrentServerContext.Provider>;
};

export const useCurrentServer = () => {
   const context = useContext(CurrentServerContext);
   if (context === undefined) {
      throw new Error("useCurrentServer must be used within a CurrentServerProvider");
   }
   return context;
};
