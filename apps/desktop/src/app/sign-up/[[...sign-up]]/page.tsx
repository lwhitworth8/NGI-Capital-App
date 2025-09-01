"use client";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Use hash routing to avoid path-based middleware issues */}
      <SignUp routing="hash" signInUrl="/sign-in" />
    </div>
  );
}
