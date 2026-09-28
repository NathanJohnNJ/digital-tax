
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start w-full h-full mx-auto w-full max-w-3xl px-4 py-10">
      {children}
    </div>
  );
}