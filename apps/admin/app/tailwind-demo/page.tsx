export default function TailwindDemo() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-16">

                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        Tailwind CSS Demo
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Showcasing classic layout patterns and components built with utility classes.
                    </p>
                </div>

                {/* Hero Section */}
                <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden md:flex">
                    <div className="p-8 md:p-12 md:w-1/2 flex flex-col justify-center">
                        <div className="uppercase tracking-wide text-sm text-indigo-500 font-semibold">
                            Hero Section
                        </div>
                        <h2 className="mt-2 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                            Build stunning web apps
                        </h2>
                        <p className="mt-4 text-gray-500 dark:text-gray-300 text-lg">
                            Tailwind CSS allows you to rapidly build modern websites without ever leaving your HTML.
                        </p>
                        <div className="mt-8 flex gap-4">
                            <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition duration-300 shadow-md">
                                Get Started
                            </button>
                            <button className="bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border border-current px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition duration-300">
                                Learn More
                            </button>
                        </div>
                    </div>
                    <div className="md:w-1/2 bg-indigo-100 flex items-center justify-center p-12">
                        {/* Abstract illustration placeholder */}
                        <div className="relative w-full aspect-video bg-gradient-to-tr from-indigo-400 to-purple-500 rounded-xl shadow-inner flex items-center justify-center text-white font-bold opacity-80 rotate-3 transform hover:rotate-0 transition duration-500">
                            Hero Image Area
                        </div>
                    </div>
                </section>

                {/* Card Grid Section */}
                <section>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 border-l-4 border-indigo-600 pl-4">
                        Interactive Cards
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((item) => (
                            <div key={item} className="group bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse group-hover:animate-none group-hover:from-blue-400 group-hover:to-indigo-500 transition-colors duration-500"></div>
                                <div className="p-6">
                                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Feature Card {item}</h4>
                                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                                        This card demonstrates hover states, transitions, and shadow effects.
                                    </p>
                                    <a href="#" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline block w-full text-right">
                                        Read more &rarr;
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Form Layout Section */}
                <section className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 md:p-16">
                    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                        <div className="px-8 py-10">
                            <h3 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-8">
                                Sign In Example
                            </h3>
                            <form className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        id="password"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white transition-colors"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <input
                                            id="remember-me"
                                            type="checkbox"
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                            Remember me
                                        </label>
                                    </div>
                                    <div className="text-sm">
                                        <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                                            Forgot password?
                                        </a>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-[1.02]"
                                >
                                    Sign in
                                </button>
                            </form>
                        </div>
                        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-700 text-center">
                            <span className="text-sm text-gray-600 dark:text-gray-300">Dsont have an account? </span>
                            <a href="#" className="font-medium text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
                                Sign up
                            </a>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
