import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { IconShield, IconStethoscope } from "@tabler/icons-react"
import { AuthAPI, AuthStorage } from "@/api/auth"
import { getLoginErrorMessage } from "@/lib/errors"
import { useAuth } from "@/hooks/use-auth"
import { MfaDialog } from "@/components/mfa-dialog"

interface LoginPageProps {
  onLogin: (userType: 'admin' | 'doctor') => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const navigate = useNavigate()
  const { accessToken, role, setAccessToken } = useAuth()

  // Redirect if already authenticated
  useEffect(() => {
    if (accessToken && role) {
      const defaultRoute = role === 'admin' ? '/admin/analytics' : '/doctor/appointments'
      navigate(defaultRoute, { replace: true })
    }
  }, [accessToken, role, navigate])
  const [userType, setUserType] = useState<'admin' | 'doctor'>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMfaDialog, setShowMfaDialog] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const loginData = {
        email: email.trim(),
        password,
      }

      let response
      if (userType === 'admin') {
        response = await AuthAPI.adminLogin(loginData)

        // Handle MFA requirement for admin login
        if (response.mfa_required) {
          setShowMfaDialog(true)
          setIsLoading(false)
          setError('MFA code required. Please enter your 6-digit MFA code.')
          return
        }

        if (!response.access_token) {
          setError('Login successful but no access token received. Please try again.')
          return
        }

        setAccessToken(response.access_token)

        const decoded = AuthStorage.decodeToken(response.access_token)
        const userRole = decoded?.role || 'admin'

        onLogin(userRole as 'admin' | 'doctor')
        navigate('/admin/analytics', { replace: true })
      } else {
        response = await AuthAPI.doctorLogin(loginData)
        if (!response.access_token) {
          setError('Login successful but no access token received. Please try again.')
          return
        }

        setAccessToken(response.access_token)

        const decoded = AuthStorage.decodeToken(response.access_token)
        const userRole = decoded?.role || 'doctor'

        onLogin(userRole as 'admin' | 'doctor')
        navigate('/doctor/appointments', { replace: true })
      }
    } catch (err) {
      const errorMessage = getLoginErrorMessage(err)
      setError(errorMessage)
      setShowMfaDialog(false) // Reset MFA on error
      setMfaError(null)
      setIsLoading(false) // Only reset loading state on error
    }
    // Note: We don't reset isLoading on success because the page will redirect
    // This prevents the brief flash back to "Login" button before dashboard loads
  }



  return (
    <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden" data-theme="light" style={{ colorScheme: 'light' }}>

      <div className="w-full flex flex-col lg:flex-row min-h-screen">

        {/* Left Side - Branding with Teal Background (hidden on mobile, visible on tablet+) */}
        <div className="hidden md:flex flex-1 bg-[#0ea5a3] px-6 lg:px-12 py-10 flex-col justify-between relative overflow-hidden">
          {/* Decorative Blur Elements */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-white/10 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-900/20 rounded-full blur-[80px] pointer-events-none" />

          {/* Top: Logo */}
          <div className="flex items-center gap-3 relative z-10">
            <img src="/logo.svg" alt="EZMedTech Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
            <span className="text-xl md:text-2xl font-semibold text-white tracking-tight">EZMedTech</span>
          </div>

          {/* Middle: Headlines */}
          <div className="max-w-xl mt-8 lg:mt-0 relative z-10">
            <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white leading-[1.1] tracking-tight mb-4 lg:mb-6">
              Effortlessly Manage Your Medical Practice.
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-white/90 font-medium">
              Manage Patients Information, Appointments, And More.
            </p>
          </div>

          {/* Bottom: Footer */}
          <div className="flex items-center justify-between text-xs sm:text-sm text-white/80 mt-8 lg:mt-0 relative z-10">
            <span>© 2025 EZMedTech. All rights reserved.</span>
            <span className="cursor-pointer hover:text-white transition-colors">Privacy Policy</span>
          </div>
        </div>

        {/* Right Side - Login Form with Light Background */}
        <div className="flex-1 bg-[#dfe6f0] px-4 sm:px-6 lg:px-12 py-6 lg:py-10 flex flex-col items-center justify-center relative">
          {/* Decorative Blob */}
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-teal-200/30 rounded-full blur-[100px] pointer-events-none" />

          {/* Mobile Logo (only visible on mobile) */}
          <div className="flex md:hidden items-center gap-2 mb-6">
            <img src="/logo.png" alt="EZMedTech Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-semibold text-slate-800 tracking-tight">EZMedTech</span>
          </div>

          <div className="glass-card w-full max-w-md p-6 sm:p-8 relative z-10">

            {/* Form Internal Structure */}
            <div className="relative z-10">

              {/* User Type Tabs - Pill Style with transparent glass */}
              <div className="bg-white/40 backdrop-blur-md rounded-full p-1.5 flex mb-8 shadow-sm border border-white/50">
                <button
                  onClick={() => setUserType('admin')}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${userType === 'admin'
                    ? 'bg-[#0ea5a3] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/30'
                    }`}
                >
                  <IconShield className="w-4 h-4" />
                  Admin
                </button>
                <button
                  onClick={() => setUserType('doctor')}
                  className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${userType === 'doctor'
                    ? 'bg-[#0ea5a3] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/30'
                    }`}
                >
                  <IconStethoscope className="w-4 h-4" />
                  Doctor
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 p-3 mb-6 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 ml-1">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="h-12 border border-white/50 bg-white/30 backdrop-blur-sm focus:bg-white/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/30 rounded-xl transition-all font-medium text-slate-800 placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 ml-1">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 pr-10 border border-white/50 bg-white/30 backdrop-blur-sm focus:bg-white/50 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500/30 rounded-xl transition-all font-medium text-slate-800 placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 h-full px-4 text-slate-400 hover:text-slate-600 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      className="border-slate-300 data-[state=checked]:bg-teal-500 data-[state=checked]:border-teal-500"
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer text-slate-500 font-medium">
                      Remember Me
                    </Label>
                  </div>
                  <span className="text-sm text-slate-500 hover:text-teal-600 cursor-pointer transition-colors">
                    Forgot Password?
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-white rounded-full py-6 font-semibold text-base shadow-[0_10px_25px_-5px_rgba(14,165,163,0.4)] hover:shadow-[0_12px_30px_-5px_rgba(14,165,163,0.5)] transition-all bg-[#0ea5a3] hover:bg-[#0d9593] border-none mt-2"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Login <span className="text-xl leading-none mb-0.5">→</span>
                    </div>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {/* MFA Dialog */}
      <MfaDialog
        open={showMfaDialog}
        onOpenChange={(open) => {
          setShowMfaDialog(open)
          if (!open) {
            setMfaError(null)
          }
        }}
        onSubmit={async (mfaCode) => {
          try {
            setIsLoading(true)
            setError(null)
            setMfaError(null)

            const loginData = {
              email: email.trim(),
              password,
              mfa_code: mfaCode,
            }

            const response = await AuthAPI.adminLogin(loginData)

            if (!response.access_token) {
              setError('Login successful but no access token received. Please try again.')
              setShowMfaDialog(false)
              setIsLoading(false)
              return
            }

            setAccessToken(response.access_token)
            const decoded = AuthStorage.decodeToken(response.access_token)
            // Default to admin role if not present
            const userRole = decoded?.role || 'admin'
            setShowMfaDialog(false)
            onLogin(userRole as 'admin' | 'doctor')
            navigate('/admin/analytics', { replace: true })
          } catch (err) {
            const statusCode = (err as any)?.statusCode || (err as any)?.response?.status
            if (statusCode === 401) {
              setMfaError('Invalid MFA code. Please try again.')
            } else {
              const errorMessage = getLoginErrorMessage(err)
              setError(errorMessage)
              setShowMfaDialog(false)
            }
            setIsLoading(false)
          }
        }}
        title="MFA Code Required"
        description="Please enter your 6-digit MFA code to complete login."
        isLoading={isLoading}
        error={mfaError}
        onErrorChange={setMfaError}
      />
    </div >
  )
}
