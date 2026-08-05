import Sidebar from "./components/Sidebar";
import Search from "./components/Search";
import MDXTheme from "./components/MDXTheme";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full w-full">
      <Sidebar />

      <main className="flex-1 p-10 h-full w-full overflow-y-scroll">
        <Search />
        <div className="h-6"></div>
        <MDXTheme>{children}</MDXTheme>
      </main>
    </div>
  );
}
