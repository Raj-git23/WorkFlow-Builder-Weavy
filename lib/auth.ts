import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


interface AuthContext {
    userId: string;
    email?: string | null;
    name?: string | null;
}


export async function getCurrentUser() {
    const user = await currentUser();
    const { userId } = await auth();

    return { 'currentUser': user, 'userId': userId };
}

export async function getAuthUser(): Promise<AuthContext | null> {

    try {
        const { userId } = await auth();

        if (!userId) return null;
        return { userId };

    } catch (error) {
        console.error("Error retrieving auth user:", error);
        return null;
    }
}


export async function requireAuth(): Promise<
    { user: AuthContext; error: null; } |
    { user: null; error: NextResponse; }
> {
    const user = await getAuthUser();

    if (!user) {
        return {
            user: null,
            error: NextResponse.json(
                { error: "Unauthorised" },
                { status: 401 }
            )
        };
    };

    return { user, error: null };
}
