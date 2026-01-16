import { type FC } from "react";
import { TouchableLink } from "./TouchableLink";
import { BRANDING } from "@/constants";
import { useAuth } from "@/providers/AuthProvider";
import { User, LogOut, FolderOpen, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Topbar: FC = () => {
   const { isAuthenticated, user, clearAuth, isLoading } = useAuth();
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);

   // Close dropdown when clicking outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsDropdownOpen(false);
         }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   const handleLogout = () => {
      clearAuth();
      setIsDropdownOpen(false);
   };

   return (
      <div className="bg-indigo-950 z-50 fixed top-0 left-0 right-0">
         <div className="h-16 text-white flex items-center px-4 w-full max-w-5xl mx-auto">
            <TouchableLink to="/" className="flex-shrink-0 font-semibold text-lg">
               {BRANDING ?? "pomfd"}
            </TouchableLink>

            <div className="w-full shrink-1"></div>

            {/* Auth buttons / User menu */}
            {isLoading ? (
               <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
            ) : isAuthenticated ? (
               <div className="relative" ref={dropdownRef}>
                  <button
                     onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                     className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                     {user?.profilePhoto ? (
                        <img
                           src={user.profilePhoto}
                           alt={user.username}
                           className="w-8 h-8 rounded-full object-cover"
                        />
                     ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                           <User size={16} />
                        </div>
                     )}
                     <span className="hidden sm:block font-medium">
                        {user?.fullName || user?.username || 'User'}
                     </span>
                     <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  {isDropdownOpen && (
                     <div className="absolute right-0 mt-2 w-56 rounded-xl bg-indigo-900/95 backdrop-blur-lg border border-white/10 shadow-2xl py-2 z-50">
                        <div className="px-4 py-2 border-b border-white/10">
                           <p className="font-medium text-white truncate">{user?.fullName || user?.username}</p>
                           <p className="text-sm text-white/50 truncate">{user?.email}</p>
                        </div>

                        <TouchableLink
                           to="/my-files"
                           className="flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors"
                           onClick={() => setIsDropdownOpen(false)}
                        >
                           <FolderOpen size={18} className="text-blue-400" />
                           <span>My Files</span>
                        </TouchableLink>

                        <button
                           onClick={handleLogout}
                           className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-red-400"
                        >
                           <LogOut size={18} />
                           <span>Sign out</span>
                        </button>
                     </div>
                  )}
               </div>
            ) : (
               <div className="flex items-center gap-2">
                  <TouchableLink
                     to="/login"
                     className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                     Sign in
                  </TouchableLink>
                  <TouchableLink
                     to="/register"
                     className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all font-medium"
                  >
                     Register
                  </TouchableLink>
               </div>
            )}
         </div>
      </div>
   );
};

export default Topbar;
