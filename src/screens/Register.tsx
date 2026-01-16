import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../providers/AuthProvider";
import { BRANDING } from "@/constants";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";

const Register = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { register, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const navigate = useNavigate();

    // Redirect if already authenticated (avoid navigating during render)
    useEffect(() => {
        if (isAuthLoading) return;
        if (isAuthenticated) {
            navigate("/my-files", { replace: true });
        }
    }, [isAuthenticated, isAuthLoading, navigate]);

    // Password strength checks
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const passwordsMatch = password === confirmPassword && password.length > 0;

    const isPasswordStrong = hasMinLength && hasUppercase && hasLowercase && hasNumber;
    const canSubmit = email && username && isPasswordStrong && passwordsMatch;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!canSubmit) {
            setError("Please fill in all fields correctly");
            return;
        }

        setIsLoading(true);

        try {
            await register(email.trim(), username.trim(), password, fullName.trim() || undefined);
            navigate("/my-files", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordCheck = ({ valid, label }: { valid: boolean; label: string }) => (
        <div className={`flex items-center gap-2 text-sm ${valid ? 'text-green-400' : 'text-white/40'}`}>
            {valid ? <Check size={14} /> : <X size={14} />}
            {label}
        </div>
    );

    return (
        <>
            <Helmet>
                <title>{BRANDING ?? "pomfd"} - Register</title>
            </Helmet>

            <div className="min-h-screen flex items-center justify-center p-4 pt-20">
                {/* Glassmorphism card */}
                <div className="w-full max-w-md">
                    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-2xl p-8 shadow-2xl border border-white/10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Create account</h1>
                            <p className="text-blue-200/70">Join {BRANDING ?? "pomfd"} today</p>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email field */}
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                                    Email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="your@email.com"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Username field */}
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-blue-200 mb-2">
                                    Username
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="cooluser123"
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Full Name field (optional) */}
                            <div>
                                <label htmlFor="fullName" className="block text-sm font-medium text-blue-200 mb-2">
                                    Full Name <span className="text-white/40">(optional)</span>
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    placeholder="John Doe"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Password field */}
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                                        placeholder="Create a strong password"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>

                                {/* Password strength indicators */}
                                {password && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <PasswordCheck valid={hasMinLength} label="8+ characters" />
                                        <PasswordCheck valid={hasUppercase} label="Uppercase" />
                                        <PasswordCheck valid={hasLowercase} label="Lowercase" />
                                        <PasswordCheck valid={hasNumber} label="Number" />
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password field */}
                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-200 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`w-full px-4 py-3 rounded-lg bg-white/10 border text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12 ${confirmPassword && !passwordsMatch ? 'border-red-500/50' : 'border-white/20'
                                            }`}
                                        placeholder="Confirm your password"
                                        required
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                                {confirmPassword && !passwordsMatch && (
                                    <p className="mt-2 text-red-400 text-sm">Passwords don't match</p>
                                )}
                            </div>

                            {/* Submit button */}
                            <button
                                type="submit"
                                disabled={isLoading || !canSubmit}
                                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Creating account...
                                    </>
                                ) : (
                                    "Create account"
                                )}
                            </button>
                        </form>

                        {/* Login link */}
                        <div className="mt-8 text-center">
                            <p className="text-blue-200/70">
                                Already have an account?{" "}
                                <Link
                                    to="/login"
                                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-white/30 text-sm mt-6">
                        {BRANDING ?? "pomfd"} © {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </>
    );
};

export default Register;
