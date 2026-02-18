import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            roleRef: true,
            departmentRef: true,
          },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        // lastLoginAt 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }).catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          departmentId: user.departmentId,
          departmentName: user.departmentRef?.name,
          roleId: user.roleId,
          roleName: user.roleRef?.name,
          position: user.position,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role as string;
        token.department = (user as Record<string, unknown>).department as string;
        token.departmentId = (user as Record<string, unknown>).departmentId as string;
        token.departmentName = (user as Record<string, unknown>).departmentName as string;
        token.roleId = (user as Record<string, unknown>).roleId as string;
        token.roleName = (user as Record<string, unknown>).roleName as string;
        token.position = (user as Record<string, unknown>).position as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).department = token.department;
        (session.user as Record<string, unknown>).departmentId = token.departmentId;
        (session.user as Record<string, unknown>).departmentName = token.departmentName;
        (session.user as Record<string, unknown>).roleId = token.roleId;
        (session.user as Record<string, unknown>).roleName = token.roleName;
        (session.user as Record<string, unknown>).position = token.position;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
