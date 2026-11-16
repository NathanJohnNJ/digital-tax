import Sidebar from "./components/Sidebar";
import Search from "./components/Search";
import Breadcrumbs from './components/Breadcrumbs';
import MDXTheme from "./components/MDXTheme";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 w-full flex-1 flex-col rounded-2xl border-2 border-mauve-700 bg-linear-to-br from-mauve-100 via-white to-sky-50 md:flex-row">
      <MDXTheme>
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col items-center p-3 sm:p-6 lg:p-10">
          <div className="relative z-10 w-full">
            <Search />
          </div>
          <div className="relative w-full rounded-2xl bg-white text-slate-900 shadow-xl">
            <div className="px-4 pt-4">
              <Breadcrumbs />
            </div>
            {children}
          </div>
        </main>

      </MDXTheme>
    </div>
  );
}
