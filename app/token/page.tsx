import Link from "next/link";

export default function TokenPage() {
  return (
    <>
      <div className="flex justify-center mt-6">
        <Link href="/token/mint-usdt">
          <button className="bg-green-500 hover:bg-green-600 text-black font-semibold px-4 py-2 rounded shadow">
            Mint Test USDT
          </button>
        </Link>
      </div>
    </>
  );
} 