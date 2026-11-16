export default function TopNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full overflow-x-auto pt-4 scrollbar-none [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max items-end">
        {children}
      </div>
    </div>
  );
}