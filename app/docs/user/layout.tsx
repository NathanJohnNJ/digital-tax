
 
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center w-full h-full transition-all duration-75 bg-linear-to-t from-none from-0% via-white to-none via-30% to-100% p-10 rounded-b-2xl -ml-10 shadow-2xs">
      {children}
    </div>
  );
}