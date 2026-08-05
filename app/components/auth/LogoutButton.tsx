"use client";

export default function LogoutButton() {
  return (
    <a
      href="/auth/logout"
      className="w-min text-center inline-block px-6 py-3 border-2 border-red-700 bg-gray-200 text-red-700 font-medium rounded-full text-[14px] transition-colors shadow-2xs hover:shadow-2xl hover:scale-105"
    >
      Logout
    </a>
  );
}