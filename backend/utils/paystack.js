import Paystack from 'paystack';
import crypto from 'crypto';

const getPaystackClient = () => {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_API_KEY || '').trim();
  if (!secretKey) {
    throw new Error('Paystack secret key not configured');
  }
  return Paystack(secretKey);
};

export const initializePaystackTransfer = async ({
  amount,
  recipientCode,
  reference,
  reason,
  currency = 'NGN',
}) => {
  const paystack = getPaystackClient();

  const transferData = {
    amount: Math.round(amount * 100),
    recipient: recipientCode,
    reference: reference || `payout_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    reason: reason || 'Rater payout',
    currency,
  };

  try {
    const response = await paystack.transfer.initiate(transferData);
    return response;
  } catch (error) {
    console.error('Paystack transfer initialization error:', error);
    throw new Error(`Failed to initialize transfer: ${error.message}`);
  }
};

export const verifyPaystackTransfer = async (reference) => {
  const paystack = getPaystackClient();

  try {
    const response = await paystack.transfer.verify(reference);
    return response;
  } catch (error) {
    console.error('Paystack transfer verification error:', error);
    throw new Error(`Failed to verify transfer: ${error.message}`);
  }
};

export const createPaystackTransferRecipient = async ({
  name,
  accountNumber,
  bankCode,
  currency = 'NGN',
  type = 'nuban',
}) => {
  const paystack = getPaystackClient();

  const recipientData = {
    type,
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency,
  };

  try {
    const response = await paystack.transferRecipient.create(recipientData);
    return response;
  } catch (error) {
    console.error('Paystack recipient creation error:', error);
    throw new Error(`Failed to create recipient: ${error.message}`);
  }
};

export const listBanks = async (currency = 'NGN') => {
  const paystack = getPaystackClient();

  try {
    const response = await paystack.misc.listBanks({ currency });
    return response;
  } catch (error) {
    console.error('Paystack list banks error:', error);
    throw new Error(`Failed to list banks: ${error.message}`);
  }
};

export const resolveAccountNumber = async (accountNumber, bankCode) => {
  const paystack = getPaystackClient();

  try {
    const response = await paystack.misc.resolveAccountNumber(accountNumber, bankCode);
    return response;
  } catch (error) {
    console.error('Paystack account resolution error:', error);
    throw new Error(`Failed to resolve account: ${error.message}`);
  }
};

export const verifyPaystackWebhook = (payload, signature, rawBody) => {
  const secret = (process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_API_KEY || '').trim();
  if (!secret || typeof signature !== 'string') return false;

  const expected = crypto
    .createHmac('sha512', secret)
    .update(rawBody || JSON.stringify(payload))
    .digest();
  const provided = Buffer.from(signature, 'hex');
  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
};