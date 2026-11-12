import { createHmac, timingSafeEqual } from "node:crypto";

export function signOrderPayment(orderId: string, paymentId: string, secret: string) {
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function signWebhookBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function signaturesMatch(expected: string, received: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyOrderSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}) {
  const expected = signOrderPayment(input.orderId, input.paymentId, input.secret);
  return signaturesMatch(expected, input.signature);
}

export function verifyWebhookSignature(body: string, signature: string, secret: string) {
  return signaturesMatch(signWebhookBody(body, secret), signature);
}
