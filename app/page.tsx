import Image from 'next/image';
import Link from 'next/link';

import { LoginButton } from '@/Components/Login/LoginButton';
import { Button } from '@/Components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center">
      <div className="container mx-auto px-4 py-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/secretPineapple-logo.png"
            alt="Secret Pineapple Logo"
            width={400}
            height={300}
            priority
            className="mx-auto"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <LoginButton/>

          <Link href="/signup">
            <Button className="w-full sm:w-auto min-w-[120px] bg-green-500 hover:bg-green-600 text-white border-2 border-black rounded-full px-8 py-3 font-bold text-lg">
              Sign Up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
