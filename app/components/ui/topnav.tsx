export default function TopNav({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-row pt-4 bg-none">
      {children}
    </div>
  );
}