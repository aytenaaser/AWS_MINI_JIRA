import { useEffect, useState } from 'react'

export function useAuth() {
    const [token, setToken] = useState<string | null>(null)

    useEffect(() => {
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        const idToken = params.get('id_token')
        if (idToken) {
            localStorage.setItem('id_token', idToken)
            window.history.replaceState(null, '', '/')
            setToken(idToken)
        } else {
            const stored = localStorage.getItem('id_token')
            if (stored) setToken(stored)
        }
    }, [])

    const domain = import.meta.env.VITE_COGNITO_DOMAIN
    const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID
    const redirectUri = import.meta.env.VITE_COGNITO_REDIRECT_URI

    const login = () => {
        window.location.href = `${domain}/login?client_id=${clientId}&response_type=token&scope=openid+email&redirect_uri=${redirectUri}`
    }

    const signup = () => {
        // Cognito Hosted UI sign-up page
        window.location.href = `${domain}/signup?client_id=${clientId}&response_type=token&scope=openid+email&redirect_uri=${redirectUri}`
    }

    const logout = () => {
        localStorage.removeItem('id_token')
        setToken(null)
        login()
    }

    return { token, login, signup, logout }
}