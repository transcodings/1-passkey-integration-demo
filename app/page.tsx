import { PasskeyDemo } from "@/components/PasskeyDemo";
import { DemoMarketingCopyFragment } from "@/constants";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <header className="mb-10 max-w-lg text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {DemoMarketingCopyFragment.ShortTitleLine}
        </h1>
      </header>
      <PasskeyDemo />
    </div>
  );
}
