import { useAuth } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/pages/Dashboard'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
    const { token, login, signup } = useAuth()

    if (!token) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold">Mini Jira</h1>
                    <p className="text-gray-500">Please sign in or create an account</p>
                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={login}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={signup}
                            className="px-6 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                        >
                            Sign Up
                        </button>
                    </div>
                </div>
                <Toaster />
            </div>
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