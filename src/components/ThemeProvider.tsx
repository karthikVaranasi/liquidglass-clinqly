"use client"

import { ThemeProvider as NextThemesProvider, type Attribute } from "next-themes"
import type { ReactNode } from "react"

interface ThemeProviderProps {
    children: ReactNode
    defaultTheme?: string
    enableSystem?: boolean
    attribute?: Attribute | Attribute[]
    disableTransitionOnChange?: boolean
    storageKey?: string
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    enableSystem = true,
    attribute = "class",
    storageKey = "liquid-glass-theme",
    ...props
}: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute={attribute}
            defaultTheme={defaultTheme}
            enableSystem={enableSystem}
            storageKey={storageKey}
            {...props}
        >
            {children}
        </NextThemesProvider>
    )
}
