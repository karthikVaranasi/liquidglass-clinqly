import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthStorage } from '@/api/auth'
import { Button } from '@/components/ui/button'

interface NotFoundPageProps {
  userType?: 'admin' | 'doctor'
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ userType }) => {
  const navigate = useNavigate()
  const resolvedUserType = userType || (AuthStorage.getUserType() as 'admin' | 'doctor') || 'doctor'
  
  const handleGoHome = () => {
    const defaultPage = resolvedUserType === 'admin' ? '/admin/analytics' : '/doctor/appointments'
    navigate(defaultPage)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 px-4">
      <div className="text-center space-y-4">
        <div className="text-8xl font-bold text-muted-foreground">404</div>
        <h1 className="text-3xl font-bold">Page Not Found</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex justify-center gap-4 w-fit">
        <Button
          onClick={handleGoHome}
           className="w-full text-sm font-medium neumorphic-pressed text-foreground hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
        >
          Go Home
        </Button>
        <Button
          onClick={() => window.history.back()}
          className="w-full text-sm font-medium neumorphic-pressed text-foreground hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 px-3 py-2"
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}
