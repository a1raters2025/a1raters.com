import crypto from 'crypto';

const BASE_URL = 'https://api.paystack.co';

const getSecretKey = () => {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_API_KEY || '').trim();
  if (!secretKey) {
    throw new Error('Paystack secret key not configured');
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
  const data = await response.json();
  if (!response.ok || data?.status === false) {
    const err = new Error(data?.message || `Paystack request failed: ${response.status}`);
    err.response = data;
    throw err;
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
  return paystackFetch(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`, { method: 'GET' });
};

export const verifyPaystackWebhook = (payload, signature, rawBody) => {
  const secret = getSecretKey();
  if (!secret || typeof signature !== 'string') return false;
  const expected = crypto.createHmac('sha512', secret).update(rawBody || JSON.stringify(payload)).digest();
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};
