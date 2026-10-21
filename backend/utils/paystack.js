import crypto from 'crypto';

const BASE_URL = 'https://api.paystack.co';

const getSecretKey = () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the backend');
  }
  return secretKey;
};

const paystackFetch = async (path, options = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = null;
  }
  if (!response.ok || data?.status === false) {
    const err = new Error(data?.message || `Paystack request failed with HTTP ${response.status}`);
    err.status = response.status;
    throw err;
  }
  if (!data || typeof data !== 'object') {
    throw new Error('Paystack returned an unreadable response');
  }
  return data;
};

export const initializePaystackTransfer = async ({ amount, recipientCode, reference, reason, currency = 'NGN' }) => {
  return paystackFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amount * 100),
      recipient: recipientCode,
      reference: reference || `payout_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      reason: reason || 'Rater payout',
      currency,
    }),
  });
};

export const verifyPaystackTransfer = async (reference) => {
  return paystackFetch(`/transfer/verify/${reference}`, { method: 'GET' });
};

export const createPaystackTransferRecipient = async ({ name, accountNumber, bankCode, currency = 'NGN', type = 'nuban' }) => {
  return paystackFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type,
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    }),
  });
};

export const listBanks = async (currency = 'NGN') => {
  return paystackFetch(`/bank?currency=${encodeURIComponent(currency)}`, { method: 'GET' });
};

export const resolveAccountNumber = async (accountNumber, bankCode) => {
  const params = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode.trim(),
  });
  return paystackFetch(`/bank/resolve?${params}`, { method: 'GET' });
};

export const verifyPaystackWebhook = (payload, signature, rawBody) => {
  const secret = getSecretKey();
  if (!secret || typeof signature !== 'string') return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody || JSON.stringify(payload)).digest();
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};
