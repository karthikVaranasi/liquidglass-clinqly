"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { IconSun, IconMoon, IconDeviceDesktop } from "@tabler/icons-react"

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="liquid-glass-btn w-10 h-10 rounded-full flex items-center justify-center">
                <IconSun className="w-5 h-5 text-foreground/50" />
            </button>
        )
    }

    const cycleTheme = () => {
        if (theme === "system") {
            setTheme("light")
        } else if (theme === "light") {
            setTheme("dark")
        } else {
            setTheme("system")
        }
    }

    const getIcon = () => {
        if (theme === "system") {
            return <IconDeviceDesktop className="w-5 h-5 text-foreground transition-transform duration-300 hover:scale-110" />
        }
        if (resolvedTheme === "dark") {
            return <IconMoon className="w-5 h-5 text-foreground transition-transform duration-300 hover:scale-110" />
        }
        return <IconSun className="w-5 h-5 text-foreground transition-transform duration-300 hover:scale-110" />
    }

    const getTooltip = () => {
        if (theme === "system") return "System theme"
        if (theme === "dark") return "Dark theme"
        return "Light theme"
    }

    return (
        <button
            onClick={cycleTheme}
            className="liquid-glass-btn w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg"
            title={getTooltip()}
            aria-label={`Switch theme (current: ${getTooltip()})`}
        >
            {getIcon()}
        </button>
    )
}
