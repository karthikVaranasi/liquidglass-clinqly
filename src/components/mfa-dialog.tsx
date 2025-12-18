import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MfaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (mfaCode: string) => Promise<void>
  title?: string
  description?: string
  isLoading?: boolean
  error?: string | null
  onErrorChange?: (error: string | null) => void
}

export function MfaDialog({
  open,
  onOpenChange,
  onSubmit,
  title = "MFA Code Required",
  description = "Please enter your 6-digit MFA code.",
  isLoading = false,
  error: externalError,
  onErrorChange,
}: MfaDialogProps) {
  const [mfaCode, setMfaCode] = useState('')
  const [internalError, setInternalError] = useState<string | null>(null)

  // Use external error if provided, otherwise use internal error
  const error = externalError !== undefined ? externalError : internalError

  // Clear error and code when dialog closes
  useEffect(() => {
    if (!open) {
      setMfaCode('')
      setInternalError(null)
      if (onErrorChange) {
        onErrorChange(null)
      }
    }
  }, [open, onErrorChange])

  // Clear error when user starts typing
  const handleCodeChange = (value: string) => {
    const cleanedValue = value.replace(/\D/g, '').slice(0, 6)
    setMfaCode(cleanedValue)
    
    // Clear error when user starts typing
    if (error) {
      if (onErrorChange) {
        onErrorChange(null)
      } else {
        setInternalError(null)
      }
    }
  }

  const handleSubmit = async () => {
    if (mfaCode.length !== 6) {
      const errorMsg = 'Please enter a valid 6-digit MFA code'
      if (onErrorChange) {
        onErrorChange(errorMsg)
      } else {
        setInternalError(errorMsg)
      }
      return
    }

    try {
      await onSubmit(mfaCode)
      // On success, the parent component should close the dialog
    } catch (err) {
      // Error handling is done by the parent component
      // This catch is just to prevent unhandled promise rejection
    }
  }

  const handleCancel = () => {
    setMfaCode('')
    if (onErrorChange) {
      onErrorChange(null)
    } else {
      setInternalError(null)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="mfaCode">MFA Code</Label>
            <Input
              id="mfaCode"
              type="text"
              value={mfaCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Enter 6-digit MFA code"
              maxLength={6}
              className={`text-center text-2xl tracking-widest ${error ? 'border-red-500 focus:border-red-500' : ''}`}
              autoFocus
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && mfaCode.length === 6 && !isLoading) {
                  handleSubmit()
                }
              }}
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={mfaCode.length !== 6 || isLoading}
            className="neumorphic-button-primary"
          >
            {isLoading ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
