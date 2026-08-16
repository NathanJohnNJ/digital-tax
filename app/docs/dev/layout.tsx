
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start w-full h-full">
      {children}
    </div>
  );
}