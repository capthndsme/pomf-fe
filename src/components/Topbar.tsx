import { type FC } from "react";
import { TouchableLink } from "./TouchableLink";
import { BRANDING } from "@/constants";

const Topbar: FC = () => {
   return (
      <div className=" bg-indigo-950">
         <div className="h-16  text-white flex items-center px-4 w-full max-w-5xl mx-auto">
          <TouchableLink to="/" className="flex-shrink-0">{BRANDING ?? "pomfd"}</TouchableLink>
          <div className="w-full shrink-1"></div>
          <TouchableLink to="/register">Register</TouchableLink>
         </div>
      </div>
   );
};

export default Topbar;
