import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { IconShield, IconStethoscope } from "@tabler/icons-react"
import { AuthAPI, AuthStorage } from "@/api/auth"
import { getLoginErrorMessage } from "@/lib/errors"

interface LoginPageProps {
  onLogin: (userType: 'admin' | 'doctor', userData?: any) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {

  const [userType, setUserType] = useState<'admin' | 'doctor'>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [showMfa, setShowMfa] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const loginData = {
        email: email.trim(),
        password,
        ...(mfaCode && { mfa_code: mfaCode })
      }

      let response
      if (userType === 'admin') {
        response = await AuthAPI.adminLogin(loginData)

        // Handle MFA requirement for admin login
        if (response.mfa_required && !mfaCode) {
          setShowMfa(true)
          setIsLoading(false)
          setError('MFA code required. Please enter your 6-digit MFA code.')
          return
        }

        if (response.access_token) {
          console.log('💾 Storing admin auth data...')
          AuthStorage.setToken(response.access_token)
          AuthStorage.setUserType('admin')
          AuthStorage.setUserData(response.admin)
          console.log('✅ Admin login successful, token stored')
          onLogin('admin', response.admin)
        } else {
          setError('Login successful but no access token received. Please try again.')
        }
      } else {
        response = await AuthAPI.doctorLogin(loginData)
        console.log('💾 Storing doctor auth data...')
        AuthStorage.setToken(response.access_token)
        AuthStorage.setUserType('doctor')
        AuthStorage.setUserData(response.doctor)
        console.log('✅ Doctor login successful, token stored')
        onLogin('doctor', response.doctor)
      }
    } catch (err) {
      const errorMessage = getLoginErrorMessage(err)
      setError(errorMessage)
      setShowMfa(false) // Reset MFA on error
      setMfaCode('')
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="min-h-screen flex ">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="relative z-10 flex flex-col justify-between w-full px-12 py-12">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="EzMedTech Logo" className="w-8 h-8 object-contain" />
            <h1 className="text-xl font-semibold">EZMedTech</h1>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-4xl mb-6 leading-tight">Effortlessly manage your medical practice.</h2>
            <p className="text-lg leading-relaxed">
              Manage Patients Information, Appointments, and more.
            </p>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span>© {new Date().getFullYear()} EZMedTech. All rights reserved.</span>
            <span className="cursor-pointer">Privacy Policy</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-background min-h-screen lg:min-h-0">
        <div className="w-full max-w-md mx-auto space-y-6 sm:space-y-8 p-6 sm:p-8 rounded-lg neumorphic-pressed">
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">EZMedtech</h1>
            <p className="text-sm">Medical Dashboard</p>
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
              <TabsList className="-p-2.5 w-full">
                <TabsTrigger value="admin" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
                  <IconShield className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                  <span className="sm:hidden">Admin</span>
                </TabsTrigger>
                <TabsTrigger value="doctor" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs sm:text-sm">
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
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10 neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
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

              {/* MFA Code Field (shown when required) */}
              {showMfa && (
                <div className="space-y-2">
                  <Label htmlFor="mfaCode" className="text-sm font-medium text-foreground">
                    MFA Code
                  </Label>
                  <Input
                    id="mfaCode"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit MFA code"
                    className="neumorphic-inset border-0 focus:ring-0 shadow-none rounded-lg bg-background focus:border-0 transition-all duration-200"
                    maxLength={6}
                    required={showMfa}
                  />
                </div>
              )}

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
                  <Label htmlFor="remember" className="text-sm cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground cursor-pointer">
                  Forgot password?
                </span>
              </div>

              {/* Login Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full text-sm font-medium neumorphic-pressed text-foreground hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  )
}
