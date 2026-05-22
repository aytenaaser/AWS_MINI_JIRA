import { useAuth } from '@/hooks/useAuth'

export function HomePage() {
    const { login } = useAuth()

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
            {/* Top navigation */}
            <header className="flex justify-between items-center px-8 py-4 bg-white shadow-sm">
                <span className="text-xl font-bold text-indigo-700">Mini Jira</span>
                <button
                    onClick={login}
                    className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                    Login
                </button>
            </header>

            {/* Hero section */}
            <main className="flex-1 flex flex-col justify-center items-center px-4">
                <h1 className="text-4xl md:text-6xl font-extrabold text-gray-800 mb-4 text-center">
                    Last Minute Task Management
                </h1>
                <p className="text-lg md:text-xl text-gray-600 mb-8 text-center max-w-2xl">
                    Streamline your team’s workflow with real‑time task tracking, smart assignment, and powerful dashboards.
                </p>
                <button
                    onClick={login}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-indigo-700 transition-colors font-semibold shadow-lg"
                >
                    Get Started
                </button>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center text-sm text-gray-400">
                © 2026 Mini Jira – Built for the Cloud Computing course
            </footer>
        </div>
    )
}