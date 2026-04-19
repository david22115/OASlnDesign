import "./globals.css";

export const metadata = {
  title: "OA Admin - Dynamic Form Engine",
  description: "Enterprise OA JSONB Data Central",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="bg-slate-900 text-white h-14 flex items-center px-6">
            <h1 className="font-bold tracking-wider">OA TaskMaster [ADMIN]</h1>
          </header>
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
