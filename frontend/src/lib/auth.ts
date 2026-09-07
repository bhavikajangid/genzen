import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { SignJWT } from "jose";

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

async function signBackendJwt({
  sub,
  email,
  name,
  picture
}: {
  sub: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}) {
  const secret = mustGetEnv("NEXTAUTH_SECRET");
  const key = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({
    email: email ?? undefined,
    name: name ?? undefined,
    picture: picture ?? undefined
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60)
    .sign(key);
}

const providers = [
  GoogleProvider({
    clientId: mustGetEnv("GOOGLE_CLIENT_ID"),
    clientSecret: mustGetEnv("GOOGLE_CLIENT_SECRET")
  })
];

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async session({ session, token }) {
      const sub = typeof token.sub === "string" ? token.sub : "";
      (session.user as any).id = sub;
      (session as any).backendToken = sub
        ? await signBackendJwt({
            sub,
            email: (session.user as any)?.email,
            name: (session.user as any)?.name,
            picture: (session.user as any)?.image
          })
        : null;
      return session;
    }
  }
};
