import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { createOtpHandler } from '../_shared/otp-handler.ts';
import { createOpenWaGateway } from '../_shared/openwa.ts';

function required(name: string, fallback?: string): string {
  const value = Deno.env.get(name) ?? (fallback ? Deno.env.get(fallback) : undefined);
  if (!value?.trim()) throw new Error(`Missing server configuration: ${name}`);
  return value.trim();
}

const supabaseUrl = required('SUPABASE_URL');
const publishableKey = required('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY');
const secretKey = required('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
const authClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const serviceClient = createClient(supabaseUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

const handler = createOtpHandler({
  allowedOrigin: required('APP_ORIGIN'),
  otpPepper: required('OTP_PEPPER'),
  ipPepper: required('OTP_IP_PEPPER'),
  gateway: createOpenWaGateway({
    baseUrl: required('OPENWA_BASE_URL'),
    apiKey: required('OPENWA_API_KEY'),
    sessionId: required('OPENWA_SESSION_ID'),
  }),
  async getUser(token) {
    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id };
  },
  async createChallenge(input) {
    const { data, error } = await serviceClient.rpc('otp_create_challenge', {
      p_challenge_id: input.challengeId,
      p_actor: input.userId,
      p_phone: input.phone,
      p_purpose: input.purpose,
      p_digest: input.digest,
      p_ip_hash: input.ipHash,
    });
    if (error || typeof data !== 'object' || data === null) throw new Error('OTP challenge failed');
    const record = data as Record<string, unknown>;
    if (typeof record.challengeId !== 'string' || typeof record.expiresAt !== 'string' || typeof record.resendAt !== 'string') throw new Error('OTP challenge invalid');
    return { challengeId: record.challengeId, expiresAt: record.expiresAt, resendAt: record.resendAt };
  },
  async recordDelivery(challengeId, delivery) {
    const { error } = await serviceClient.rpc('otp_record_delivery', { p_challenge_id: challengeId, p_status: delivery.status, p_reference: delivery.reference });
    if (error) throw new Error('OTP delivery state failed');
  },
  async getChallengeContext(challengeId, userId) {
    const { data, error } = await serviceClient.rpc('otp_get_challenge_context', { p_challenge_id: challengeId, p_actor: userId });
    if (error || !data || typeof data !== 'object') return null;
    const record = data as Record<string, unknown>;
    if (typeof record.phone !== 'string' || (record.purpose !== 'register' && record.purpose !== 'change_phone')) return null;
    return { phone: record.phone, purpose: record.purpose };
  },
  async verifyChallenge(challengeId, userId, digest) {
    const { data, error } = await serviceClient.rpc('otp_verify_challenge', { p_challenge_id: challengeId, p_actor: userId, p_digest: digest });
    if (error || !data || typeof data !== 'object') throw new Error('OTP verification failed');
    const record = data as Record<string, unknown>;
    if (typeof record.status !== 'string') throw new Error('OTP verification invalid');
    return { status: record.status, ...('onboarding' in record ? { onboarding: record.onboarding } : {}) };
  },
});

Deno.serve(handler);
