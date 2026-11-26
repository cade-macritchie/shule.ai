import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyStripe } from "./stripe.ts";

const secret = "whsec_test", raw = JSON.stringify({ type: "checkout.session.completed" }), t = 1_800_000_000;
const sig = (body: string, ts = t) => `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;

test("valid signature passes", () => assert.equal(verifyStripe(raw, sig(raw), secret, 300, t + 10), true));
test("tampered body fails", () => assert.equal(verifyStripe(raw + " ", sig(raw), secret, 300, t), false));
test("old timestamp fails", () => assert.equal(verifyStripe(raw, sig(raw), secret, 300, t + 301), false));
test("missing header fails", () => assert.equal(verifyStripe(raw, null, secret), false));
