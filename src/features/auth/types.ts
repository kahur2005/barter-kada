export type AuthSession = {
  userId: string;
  email: string | null;
};

export interface AuthGateway {
  getSession(): Promise<AuthSession | null>;
  subscribe(listener: (session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string, redirectTo: string): Promise<'signed_in' | 'confirmation_required'>;
  signInWithGoogle(redirectTo: string): Promise<void>;
  signOut(): Promise<void>;
}
