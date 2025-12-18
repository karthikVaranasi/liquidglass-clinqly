import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

interface NotFoundPageProps {
  userType?: 'admin' | 'doctor'
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ userType }) => {
  const navigate = useNavigate()
  const { role } = useAuth()
  const resolvedUserType = userType || (role as 'admin' | 'doctor') || 'doctor'

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
        <p className="text-sm font-mono text-muted-foreground/60 bg-muted/20 p-2 rounded">
          URL: {window.location.pathname}
        </p>
      </div>
      <div className="flex justify-center gap-4 w-fit">
        <Button
          onClick={handleGoHome}
          className="neumorphic-button-primary"
        >
          Go Home
        </Button>
        <Button
          onClick={() => window.history.back()}
          className="neumorphic-button-primary"
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}
