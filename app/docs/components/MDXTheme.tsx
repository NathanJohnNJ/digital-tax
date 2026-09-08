"use client";

import { MDXProvider } from "@mdx-js/react";

const components = {
  h1: (props: any) => (
    <h1 className="text-6xl font-extrabold mt-8 mb-4" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-4xl font-bold -mt-4 mb-3 text-center" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold mt-4 mb-2" {...props} />
  ),
  main: (props: any) => (
    <main className="p-6" {...props} />
  ),
  div: (props: any) => (
    <div className="p-6" {...props} />
  ),
  p: (props: any) => (
    <p className="leading-relaxed text-slate-800" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc ml-6 my-4 space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal ml-6 my-4 space-y-2" {...props} />
  ),
  code: (props: any) => (
    <code className="bg-neutral-100 px-2 py-1 rounded text-sm" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-neutral-900 text-neutral-100 p-4 rounded-lg overflow-x-auto my-4" {...props} />
  ),
  table: (props: any) => (
    <table className="table-auto border-collapse my-6 w-full" {...props} />
  ),
  th: (props: any) => (
    <th className="border px-3 py-2 bg-neutral-100 font-semibold" {...props} />
  ),
  td: (props: any) => (
    <td className="border px-3 py-2" {...props} />
  ),
};

export default function MDXTheme({ children }: { children: React.ReactNode }) {
  return <MDXProvider components={components}>{children}</MDXProvider>;
}
