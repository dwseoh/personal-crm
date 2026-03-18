"use client";
import { useAuth } from "@/hooks/useAuth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    useAuth(); // This will handle authentication checks globally

    return <>{children}</>;
}
