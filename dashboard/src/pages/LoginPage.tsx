import { SignIn } from '@clerk/clerk-react';
import { clerkAppearance } from '../lib/clerk';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AT</span>
            </div>
            <span className="text-xl font-bold text-slate-900">AgentTailor</span>
          </div>
          <p className="text-slate-500 text-sm">Sign in to your account</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            fallbackRedirectUrl="/projects"
            appearance={clerkAppearance}
          />
        </div>
      </div>
    </div>
  );
}
