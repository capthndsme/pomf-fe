/** Fullsize spinner, for screens */

import { Loader2 } from "lucide-react";

const FullsizeSpinner = ({text}: {text?: string}) => {
   return (
      <div className="fixed inset-0 z-50 flex items-center flex-col justify-center bg-black bg-opacity-50">
         <Loader2 className="w-8 h-8 animate-spin" />
         {!!text && <p className="text-white">{text}</p>}
      </div>
   );
};

export default FullsizeSpinner;
