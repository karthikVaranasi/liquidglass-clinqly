import { useState, useEffect } from "react"
import { IconArrowLeft, IconShield, IconCopy, IconCheck } from "@tabler/icons-react"
import { AdminMFAAPI } from "@/api/admin"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/errors"

interface MFASettingsPageProps {
    onPageChange?: (page: string) => void
}

type MFAState = "loading" | "disabled" | "setup" | "enabled"

export function MFASettingsPage({ onPageChange }: MFASettingsPageProps) {
    const [mfaState, setMfaState] = useState<MFAState>("loading")
    const [qrCode, setQrCode] = useState<string>("")
    const [secret, setSecret] = useState<string>("")
    const [verificationCode, setVerificationCode] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false)
    const [copied, setCopied] = useState<boolean>(false)

    // Fetch MFA status on mount
    useEffect(() => {
        fetchMFAStatus()
    }, [])

    const fetchMFAStatus = async () => {
        try {
            setError("")
            const response = await AdminMFAAPI.getMFAStatus()
            setMfaState(response.mfa_enabled ? "enabled" : "disabled")
        } catch (err) {
            console.error("Failed to fetch MFA status:", err)
            setError(getErrorMessage(err))
            setMfaState("disabled")
        }
    }

    const handleEnableMFA = async () => {
        try {
            setLoading(true)
            setError("")
            const response = await AdminMFAAPI.setupMFA()
            setQrCode(response.qr_code)
            setSecret(response.secret)
            setMfaState("setup")
        } catch (err) {
            console.error("Failed to setup MFA:", err)
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleVerifyMFA = async () => {
        if (verificationCode.length !== 6) {
            setError("Please enter a valid 6-digit code")
            return
        }

        try {
            setLoading(true)
            setError("")
            const response = await AdminMFAAPI.verifyMFA(verificationCode, secret)

            if (response.success) {
                setMfaState("enabled")
                setVerificationCode("")
                setQrCode("")
                setSecret("")
            } else {
                setError(response.message || "Verification failed")
            }
        } catch (err) {
            console.error("Failed to verify MFA:", err)
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleDisableMFA = async () => {
        if (!confirm("Are you sure you want to disable two-factor authentication?")) {
            return
        }

        try {
            setLoading(true)
            setError("")
            await AdminMFAAPI.disableMFA()
            setMfaState("disabled")
        } catch (err) {
            console.error("Failed to disable MFA:", err)
            setError(getErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleCancelSetup = () => {
        setMfaState("disabled")
        setQrCode("")
        setSecret("")
        setVerificationCode("")
        setError("")
    }

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleBackToDashboard = () => {
        if (onPageChange) {
            onPageChange("dashboard")
        }
    }

    if (mfaState === "loading") {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-lg">Loading MFA settings...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="px-4 lg:px-6">
                <Button
                    onClick={handleBackToDashboard}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 neumorphic-pressed text-primary hover:text-primary-foreground px-3 py-2 rounded-lg shadow-none cursor-pointer transition-all duration-200"
                >
                    <IconArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Button>

                <div className="flex items-center gap-3 mb-2">
                    <IconShield className="w-8 h-8 text-emerald-800" />
                    <h1 className="text-2xl sm:text-3xl font-bold">Two-Factor Authentication</h1>
                </div>
                <p className="text-sm text-gray-600">
                    Add an extra layer of security to your account
                </p>
            </div>

            {/* Main Content */}
            <div className="px-4 lg:px-6">
                <div className="neumorphic-inset p-6 rounded-lg max-w-3xl">
                    {/* MFA Status Badge */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">MFA Status</span>
                            <span
                                className={`px-4 py-1 rounded-full text-sm font-medium ${mfaState === "enabled"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                    }`}
                            >
                                {mfaState === "enabled" ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Disabled State */}
                    {mfaState === "disabled" && (
                        <div className="space-y-6">
                            <div className="">
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Two-factor authentication adds an extra layer of security to your account.
                                    You'll need to enter a code from your authenticator app each time you log in.
                                </p>
                            </div>

                            <Button
                                onClick={handleEnableMFA}
                                disabled={loading}
                                className="w-full sm:w-auto text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Setting up..." : "Enable MFA"}
                            </Button>
                        </div>
                    )}

                    {/* Setup State */}
                    {mfaState === "setup" && (
                        <div className="space-y-6">
                            {/* QR Code Section */}
                            <div className="">
                                <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
                                <p className="text-sm text-gray-700 mb-4">
                                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                                </p>

                                {qrCode && (
                                    <div className="flex justify-center mb-4">
                                        <img
                                            src={qrCode}
                                            alt="MFA Setup QR Code"
                                            className="w-64 h-64"
                                        />
                                    </div>
                                )}

                                {/* Manual Entry */}
                                <div className="mt-6">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Manual Entry Secret:</p>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200">
                                            {secret}
                                        </code>
                                        <Button
                                            onClick={handleCopySecret}
                                            className="text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground p-2 rounded-lg shadow-none cursor-pointer transition-all duration-200"
                                            title="Copy to clipboard"
                                        >
                                            {copied ? (
                                                <IconCheck className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <IconCopy className="w-5 h-5" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Use this code if you cannot scan the QR code
                                    </p>
                                </div>
                            </div>

                            {/* Verification Section */}
                            <div className="">
                                <h3 className="text-lg font-semibold mb-4">Verify Setup</h3>
                                <p className="text-sm text-gray-700 mb-4">
                                    Enter the 6-digit code from your authenticator app to complete setup
                                </p>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, "")
                                        setVerificationCode(value)
                                        setError("")
                                    }}
                                    placeholder="000000"
                                    className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest neumorphic-inset rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                <Button
                                    onClick={handleVerifyMFA}
                                    disabled={loading || verificationCode.length !== 6}
                                    className="text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? "Verifying..." : "Verify & Enable"}
                                </Button>
                                <Button
                                    onClick={handleCancelSetup}
                                    disabled={loading}
                                    variant="outline"
                                    className="text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Enabled State */}
                    {mfaState === "enabled" && (
                        <div className="space-y-6">
                            <div className="">
                                <div className="flex items-center gap-3 mb-3">
                                    <IconShield className="w-6 h-6 text-green-600" />
                                    <p className="text-sm font-medium text-gray-900">
                                        Two-factor authentication is active
                                    </p>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Your account is protected with an extra layer of security. You'll need to enter a code
                                    from your authenticator app each time you log in.
                                </p>
                            </div>

                            <Button
                                onClick={handleDisableMFA}
                                disabled={loading}
                                variant="destructive"
                                className="w-full sm:w-auto text-sm font-medium neumorphic-pressed text-primary hover:text-primary-foreground rounded-lg shadow-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Disabling..." : "Disable MFA"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
