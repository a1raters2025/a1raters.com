import Paystack from 'paystack';
import crypto from 'crypto';

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

export const initializePaystackTransfer = async ({
  amount,
  recipientCode,
  reference,
  reason,
  currency = 'NGN',
}) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

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
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

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
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

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
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

  try {
    const response = await paystack.misc.listBanks({ currency });
    return response;
  } catch (error) {
    console.error('Paystack list banks error:', error);
    throw new Error(`Failed to list banks: ${error.message}`);
  }
};

export const resolveAccountNumber = async (accountNumber, bankCode) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('Paystack secret key not configured');
  }

  try {
    const response = await paystack.misc.resolveAccountNumber(accountNumber, bankCode);
    return response;
  } catch (error) {
    console.error('Paystack account resolution error:', error);
    throw new Error(`Failed to resolve account: ${error.message}`);
  }
};

export const verifyPaystackWebhook = (payload, signature) => {
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');
  return hash === signature;
};

export default paystack;