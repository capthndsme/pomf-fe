import { useNavigate } from "react-router-dom";
import TouchableOpacity from "./TouchableOpacity";
import type { ComponentProps } from "react";

export const TouchableLink = ({
   to,
   children,
   className,
   hitSlop,
   target,
   download,
   onClick,
   title
}: {
   to?: string | number;
   children: React.ReactNode;
   className?: string;
   hitSlop?: ComponentProps<typeof TouchableOpacity>["hitSlop"];
   target?: ComponentProps<"a">["target"];
   download?: ComponentProps<"a">["download"];
   onClick?: () => void;
   title?: ComponentProps<"a">["title"];
}) => {
   const navigate = useNavigate();
   return (
      <TouchableOpacity
         className={className}
         hitSlop={hitSlop}
         title={title}
         onPress={() => {
            onClick?.();
            if (download) {
               const link = document.createElement('a');
               link.href = to as string;
               link.download = download;
               document.body.appendChild(link);
               link.click();
               document.body.removeChild(link);
            } else if (target && typeof to === 'string') {
               window.open(to, target);
            } else if (to) {
               navigate(to as string);
            }

         }}
      >
         {children}
      </TouchableOpacity>
   );
};
