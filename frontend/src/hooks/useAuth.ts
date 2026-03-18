"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export function useAuth() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip auth check for public routes
        if (PUBLIC_ROUTES.includes(pathname)) {
            return;
        }

        // Check for token
        const token = localStorage.getItem("token");

        if (!token) {
            // No token, redirect to home
            router.push("/");
            return;
        }

        // Validate token expiration
        try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const isExpired = payload.exp * 1000 < Date.now();

            if (isExpired) {
                // Token expired, clear and redirect
                localStorage.removeItem("token");
                localStorage.removeItem("user_id");
                localStorage.removeItem("username");
                localStorage.removeItem("cached_contacts");
                router.push("/");
            }
        } catch (err) {
            // Invalid token format, clear and redirect
            console.error("Invalid token format:", err);
            localStorage.removeItem("token");
            localStorage.removeItem("user_id");
            localStorage.removeItem("username");
            localStorage.removeItem("cached_contacts");
            router.push("/");
        }
    }, [pathname, router]);

    return {
        isPublicRoute: PUBLIC_ROUTES.includes(pathname),
    };
}

// Helper function to logout
export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    localStorage.removeItem("cached_contacts");
    window.location.href = "/";
}
