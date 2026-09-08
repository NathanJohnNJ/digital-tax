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
    <div className="flex h-[99%] w-[99.75%] ml-[-0.25%] border-2 border-mauve-700 rounded-2xl">
      <MDXTheme>
        <Sidebar />
        <main className="flex flex-col items-center flex-1 p-10 h-full w-full overflow-y-scroll scrollbar-none">
          <div className="relative w-full overflow-visible">
            <Search />
          </div>
          <div className="bg-mauve-50 shadow-xl rounded-2xl w-full h-full overflow-y-auto relative">
            <div className="absolute left-3 top-2">
              <Breadcrumbs />
            </div>
            {children}
          </div>
        </main>

      </MDXTheme>
    </div>
  );
}
