import { Navbar } from '../components/ui';

/**
 * MainLayout — wraps every page with the top navigation bar
 * and a centered content container.
 */
export function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-surface-100 ">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
