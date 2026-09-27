import Image from "next/image";

export function LogoMark({ size = 36 }: { size?: number }) {
  return <Image src="/logo.svg" alt="CodeBuddy logo" width={size} height={size} priority />;
}

export function LogoWordmark({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-xl font-bold tracking-tight">
        Code<span className="text-teal-400">Buddy</span>
      </span>
    </span>
  );
}
