import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Toaster } from '@/components/ui/toaster'
import { HomePage } from '@/pages/HomePage'

export default function App() {
    const { token } = useAuth()

    if (!token) {
        return (
            <>
                <HomePage />
                <Toaster />
            </>
        )
    }

    return (
        <>
            <Toaster />
            <ProtectedRoute>
                <Layout>
                    <Dashboard />
                </Layout>
            </ProtectedRoute>
        </>
    )
}