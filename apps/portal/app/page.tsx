import Link from "next/link";

export default function Page() {
    return (
        <main className="min-h-screen p-24 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-5xl w-full mx-auto">
                <h1 className="text-4xl font-bold mb-12 text-center text-gray-900 dark:text-white">
                    TaskMaster Project Hub
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Link
                        href="/tailwind-demo"
                        className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-800/30 bg-white dark:bg-gray-800 shadow-sm"
                    >
                        <h2 className={`mb-3 text-2xl font-semibold text-gray-900 dark:text-white`}>
                            Tailwind Demo{" "}
                            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                                -&gt;
                            </span>
                        </h2>
                        <p className={`m-0 max-w-[30ch] text-sm opacity-50 text-gray-600 dark:text-gray-400`}>
                            Explore the Tailwind CSS components and layout examples.
                        </p>
                    </Link>

                    {/* Placeholder for future links */}
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-5 py-4 flex items-center justify-center opacity-50">
                        <p className="text-gray-500 text-sm">More apps coming soon...</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
