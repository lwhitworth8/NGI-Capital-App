"use client";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Use hash routing and post-auth redirect to '/' for partners */}
      <SignIn routing="hash" signUpUrl="/sign-up" afterSignInUrl="/" />
    </div>
  );
}
