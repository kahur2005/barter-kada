export type OnboardingStep = 'profile' | 'location' | 'phone' | 'complete';
export type OnboardingState = {
  nextStep: OnboardingStep;
  displayName: string;
  bio: string | null;
  areaId: string | null;
  address: string | null;
  maskedPhone: string | null;
  phoneVerified: boolean;
};
export type ServiceArea = { areaId: string; name: string };

export interface OnboardingGateway {
  getState(): Promise<OnboardingState>;
  listAreas(): Promise<ServiceArea[]>;
  completeProfile(input: { displayName: string; bio: string | null }): Promise<OnboardingState>;
  setLocation(input: { areaId: string; latitude: number; longitude: number; address: string | null }): Promise<OnboardingState>;
  requestOtp(input: { phone: string; purpose: 'register' | 'change_phone' }): Promise<{ challengeId: string; expiresAt: string; resendAt: string; deliveryStatus: 'accepted' | 'failed' | 'unknown' }>;
  verifyOtp(input: { challengeId: string; code: string }): Promise<OnboardingState>;
}
