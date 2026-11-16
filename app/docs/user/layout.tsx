
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col items-center rounded-b-2xl">
      {children}
    </div>
  );
}