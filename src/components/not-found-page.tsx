import React from 'react'

interface NotFoundPageProps {
  onPageChange: (page: string) => void
  userType: 'admin' | 'doctor'
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onPageChange, userType }) => {
  const handleGoHome = () => {
    onPageChange(userType === 'admin' ? 'dashboard' : 'appointments')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
      <div className="text-center space-y-4">
        <div className="text-8xl font-bold text-muted-foreground">404</div>
        <h1 className="text-3xl font-bold">Page Not Found</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex gap-4">
        <button
          onClick={handleGoHome}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
        >
          Go Home
        </button>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-3 border border-border rounded-lg hover:bg-muted transition-colors font-medium"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
