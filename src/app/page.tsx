import HelloWorld from '@/components/HelloWorld';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="w-full max-w-4xl">
        <HelloWorld />
      </div>
    </main>
  );
}
