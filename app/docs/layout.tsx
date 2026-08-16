import Sidebar from "./components/Sidebar";
import Search from "./components/Search";
import MDXTheme from "./components/MDXTheme";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full border-2 border-mauve-700 rounded-2xl">
      <Sidebar />

      <main className="flex flex-col items-center flex-1 p-10 h-full w-full overflow-y-scroll">
        
        <div className="relative w-full overflow-visible">
            <Search />
        </div>
        
        <MDXTheme>{children}</MDXTheme>
      </main>
    </div>
  );
}
