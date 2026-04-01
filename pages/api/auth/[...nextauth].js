import { Pool } from 'pg';

const NextAuth = require('next-auth').default;
const GoogleProvider = require('next-auth/providers/google').default;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertUser({ email, name, image, providerId }) {
  const result = await pool.query(
    `INSERT INTO users (email, name, image, provider, provider_id, last_login)
     VALUES ($1, $2, $3, 'google', $4, NOW())
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, image = EXCLUDED.image,
                   provider_id = EXCLUDED.provider_id, last_login = NOW()
     RETURNING id`,
    [email, name, image, providerId]
  );
  return result.rows[0].id;
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        const userId = await upsertUser({
          email: user.email,
          name: user.name,
          image: user.image,
          providerId: account.providerAccountId,
        });
        user.dbId = userId;
        return true;
      } catch (err) {
        console.error('NextAuth signIn error:', err.message);
        return false;
      }
    },
    async session({ session, token }) {
      // Attach our internal DB user id to the session
      if (token?.dbId) {
        session.user.dbId = token.dbId;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.dbId) {
        token.dbId = user.dbId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/what-to-watch',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
