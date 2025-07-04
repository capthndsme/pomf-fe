import { useNavigate } from "react-router-dom"
import TouchableOpacity from "./TouchableOpacity";

export const TouchableLink = ({
  to,
  children,
  className,
}: {
  to: string | number,
  children: React.ReactNode,
  className?: string,
}) => {
  const navigate = useNavigate();
  return <TouchableOpacity className={className} 
  // @ts-ignore broken conditionals
  onPress={() => navigate(to)}>
    {children}
  </TouchableOpacity>
}