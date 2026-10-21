export const getConsentedUserAgent = (req) =>
  (req.cookies?.device_assessment_consent === "accepted" ||
    req.get("x-device-assessment-consent") === "accepted")
    ? req.get("user-agent") || undefined
    : undefined;
