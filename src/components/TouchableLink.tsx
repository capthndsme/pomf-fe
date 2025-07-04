import { useNavigate } from "react-router-dom";
import TouchableOpacity from "./TouchableOpacity";
import type { ComponentProps } from "react";

export const TouchableLink = ({
   to,
   children,
   className,
   hitSlop,
   target,
}: {
   to?: string | number;
   children: React.ReactNode;
   className?: string;
   hitSlop?: ComponentProps<typeof TouchableOpacity>["hitSlop"];
   target?: ComponentProps<"a">["target"];
}) => {
   const navigate = useNavigate();
   return (
      <TouchableOpacity
         className={className}
         hitSlop={hitSlop}
         onPress={() => {
            target && typeof to === "string"
               ? window.open(to, target)
               : // @ts-ignore broken conditionals
                 navigate(to);
         }}
      >
         {children}
      </TouchableOpacity>
   );
};
