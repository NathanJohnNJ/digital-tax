 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center w-full">
      {children}
    </div>
  );
}