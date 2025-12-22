import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
    <div className="min-h-screen flex liquid-glass-login-bg" data-theme="light" style={{ colorScheme: 'light' }}>
      {/* Left side - Light theme only */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="EzMedTech Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-semibold text-slate-800">EZMedTech</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl mb-6 leading-tight font-bold text-slate-800">Effortlessly manage your medical practice.</h2>
            <p className="text-lg leading-relaxed text-black">
              Manage Patients Information, Appointments, and more.
            </p>
          </div>

          <div className="flex justify-between items-center text-sm text-black">
            <span>© {new Date().getFullYear()} EZMedTech. All rights reserved.</span>
            <span className="cursor-pointer hover:text-primary transition-colors">Privacy Policy</span>
          </div>
        </div>
      </div>

      {/* Right side - Login form with liquid glass */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen lg:min-h-0 relative">
        <div className="w-full max-w-md mx-auto space-y-6 sm:space-y-8 p-6 sm:p-8 rounded-2xl liquid-glass backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(38,198,192,0.2)] relative z-10">
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">EZMedtech</h1>
            <p className="text-sm text-gray-600">Medical Dashboard</p>
          </div>

          <div className="space-y-4">
            <div className="text-center -mt-3">
              {/* <h2 className="text-xl sm:text-2xl text-foreground font-semibold">Login</h2> */}
              {/* <p className="text-sm sm:text-base mt-1">Sign in to your account</p> */}
            </div>

            {/* User Type Selection */}
            <Tabs
              value={userType}
              onValueChange={(value) => setUserType(value as 'admin' | 'doctor')}
            >
              <TabsList className="-p-2.5 w-full !bg-white rounded-full p-1 shadow-sm border border-gray-200">
                <TabsTrigger value="admin" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm rounded-full !bg-gray-100 !text-gray-900 data-[state=active]:!bg-primary data-[state=active]:!text-white transition-all">
                  <IconShield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
                <TabsTrigger value="doctor" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm rounded-full !bg-gray-100 !text-gray-900 data-[state=active]:!bg-primary data-[state=active]:!text-white transition-all">
                  <IconStethoscope className="w-4 h-4" />
                  <span className="hidden sm:inline">Doctor</span>
                  <span className="sm:hidden">Doctor</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="border border-gray-300 focus:ring-2 focus:ring-primary/30 shadow-none rounded-xl bg-gray-50 focus:border-primary/50 transition-all duration-200 text-gray-900"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10 border border-gray-300 focus:ring-2 focus:ring-primary/30 shadow-none rounded-xl bg-gray-50 focus:border-primary/50 transition-all duration-200 text-gray-900"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-2 w-2" />
                    ) : (
                      <Eye className="h-2 w-2" />
                    )}
                  </Button>
                </div>
              </div>


              {/* Remember me and Forgot password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                  <Label htmlFor="remember" className="text-sm cursor-pointer text-gray-700">
                    Remember me
                  </Label>
                </div>
                <span className="text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                  Forgot password?
                </span>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-white rounded-xl py-3 font-semibold shadow-[0_0_20px_rgba(38,198,192,0.5)] hover:shadow-[0_0_30px_rgba(38,198,192,0.7)] transition-all duration-300"
                style={{ backgroundColor: '#0ea5a3' }}
              >
                {isLoading ? (
                  <>
                    <span>Logging in...</span>
                    <div className="ml-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <span className="text-lg ml-2">→</span>
                  </>
                )}
              </Button>
            </form>

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
    </div>
  )
}
