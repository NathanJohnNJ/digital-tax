
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 w-full flex-1">
      {children}
    </div>
  );
}