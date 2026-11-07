import { spawn } from 'child_process';
import crypto from 'crypto';

const PORT = 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 ESCROWPAY GLOBAL — COMPREHENSIVE END-TO-END TEST SUITE');
  console.log('======================================================\n');

  console.log('▶ [1/4] Starting Next.js Production Server on port', PORT, '...');
  const server = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
    stdio: 'pipe',
  });

  server.stdout.on('data', (d) => {
    console.log(`[Next.js stdout]: ${d.toString().trim()}`);
  });
  server.stderr.on('data', (d) => {
    console.error(`[Next.js stderr]: ${d.toString().trim()}`);
  });
  server.on('exit', (code) => {
    console.log(`[Next.js exited with code]: ${code}`);
  });

  // Wait for server to boot
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/logs`);
      if (res.ok) {
        ready = true;
        break;
      } else {
        console.log(`Probe returned HTTP ${res.status}`);
      }
    } catch (e) {
      // console.log(`Probe error: ${e.message}`);
    }
    await sleep(1000);
  }

  if (!ready) {
    console.error('❌ Server failed to start within 30 seconds.');
    server.kill();
    process.exit(1);
  }

  console.log('  🟢 Server is live and responsive!\n');

  try {
    // TEST 1: GET Contracts
    console.log('▶ [2/4] Testing Contract Management & BaaS Virtual Accounts...');
    const listRes = await fetch(`${BASE_URL}/api/contracts`);
    assert(listRes.ok, 'GET /api/contracts returns HTTP 200');
    const listData = await listRes.json();
    assert(Array.isArray(listData.contracts), 'Returns array of contracts');
    assert(listData.contracts.length >= 2, 'Initial demo seed contracts present');

    // TEST 2: POST Contract Creation (USD with Community Federal Virtual Account)
    const createPayload = {
      title: 'E2E Automated Cross-Border Milestone Escrow',
      description: 'End-to-end test project verifying Blaaiz architecture integration',
      clientName: 'Silicon Valley Labs LLC',
      clientEmail: 'billing@svlabs.com',
      freelancerName: 'Emeka Eze',
      freelancerEmail: 'emeka@lagosdev.com',
      freelancerCountry: 'Nigeria',
      currency: 'USD',
      targetPayoutCurrency: 'NGN',
      payoutMethod: 'bank_transfer',
      totalAmount: 1800,
      autoHedgeStablecoin: true,
      payoutDetails: {
        bankName: 'Zenith Bank PLC',
        accountNumber: '2109847321',
        bankCode: '057',
      },
      milestones: [
        { title: 'Milestone 1: Smart Contract Audit', amount: 800 },
        { title: 'Milestone 2: Production Deploy & Docs', amount: 1000 },
      ],
    };

    const createRes = await fetch(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload),
    });

    assert(createRes.status === 201, 'POST /api/contracts returns HTTP 201 Created');
    const createdData = await createRes.json();
    const newContract = createdData.contract;
    assert(newContract && newContract.id, 'Contract object created with valid ID');
    assert(newContract.status === 'AWAITING_DEPOSIT', 'Contract status starts at AWAITING_DEPOSIT');
    assert(newContract.virtualAccount !== undefined, 'Dedicated Blaaiz Virtual Account is provisioned');
    assert(newContract.virtualAccount.routingNumber === '021000021', 'US Virtual Account contains valid ACH/Wire routing');
    assert(newContract.virtualAccount.accountNumber.length === 10, 'Virtual Account number generated');

    console.log(`     Provisioned BaaS Account: ${newContract.virtualAccount.bankName}`);
    console.log(`     Account No: ${newContract.virtualAccount.accountNumber} | Ref: ${newContract.virtualAccount.merchantReference}\n`);

    // TEST 3: Cryptographic Webhook Security (Tampering Check)
    console.log('▶ [3/4] Testing Webhook Signature Verification & FX Stablecoin Shield...');
    const fakePayload = JSON.stringify({ event: 'collection.successful', amount: 99999 });
    const forgedRes = await fetch(`${BASE_URL}/api/webhooks/blaaiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-blaaiz-signature': 'forged_fake_signature_hash_0000000000000000',
      },
      body: fakePayload,
    });
    assert(
      forgedRes.status === 401,
      'Webhook rejects invalid/forged x-blaaiz-signature with HTTP 401'
    );

    // Regression: the old "x-blaaiz-simulation" header must NOT bypass signature verification
    const bypassRes = await fetch(`${BASE_URL}/api/webhooks/blaaiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-blaaiz-simulation': 'true' },
      body: JSON.stringify({
        event: 'collection.successful',
        merchant_reference: `ESCROW-${newContract.id}`,
        amount: 1800,
        currency: 'USD',
      }),
    });
    assert(bypassRes.status === 401, 'Unsigned webhook with simulation header is rejected (no bypass)');

    // Regression: payout on an unfunded contract must be refused
    const unfundedPayout = await fetch(`${BASE_URL}/api/blaaiz/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: newContract.id, milestoneId: newContract.milestones[0].id }),
    });
    assert(unfundedPayout.status === 409, 'Payout on unfunded contract is refused (HTTP 409)');

    // Regression: invalid contract input is rejected
    const badCreate = await fetch(`${BASE_URL}/api/contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...createPayload, totalAmount: 5000 }),
    });
    assert(badCreate.status === 400, 'Contract whose milestones do not sum to total is rejected (HTTP 400)');

    // Regression: SSRF guard on test-connection
    const ssrfRes = await fetch(`${BASE_URL}/api/blaaiz/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: 'real_id', clientSecret: 'real_secret', baseUrl: 'http://127.0.0.1:9' }),
    });
    assert(ssrfRes.status === 400, 'test-connection refuses non-Blaaiz baseUrl (SSRF guard)');

    // TEST 4: Valid Cryptographic Webhook Deposit Simulation
    const simRes = await fetch(`${BASE_URL}/api/simulate/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: newContract.id }),
    });

    assert(simRes.ok, 'Simulated deposit webhook accepted and verified');
    const simData = await simRes.json();
    assert(simData.signature && simData.signature.length === 64, 'Generated authentic HMAC-SHA256 signature (64 hex chars)');

    // Verify Contract Transition to ESCROWED_HEDGED
    const verifyContractRes = await fetch(`${BASE_URL}/api/contracts/${newContract.id}`);
    const verifyContractData = await verifyContractRes.json();
    const fundedContract = verifyContractData.contract;

    assert(
      fundedContract.status === 'ESCROWED_HEDGED',
      'Contract transitioned to ESCROWED_HEDGED state'
    );
    assert(
      fundedContract.hedgeDetails && fundedContract.hedgeDetails.hedgedTo === 'USDC',
      'FX Devaluation Shield activated (Hedged to USDC)'
    );
    assert(
      fundedContract.hedgeDetails.valueSavedNgn > 0,
      `Calculated devaluation savings: ₦${fundedContract.hedgeDetails.valueSavedNgn.toLocaleString()} protected!`
    );
    assert(
      fundedContract.milestones[0].status === 'ESCROWED',
      'Milestones status transitioned from PENDING_DEPOSIT to ESCROWED'
    );

    // Regression: replaying the exact same signed webhook is a no-op
    const replayRes = await fetch(`${BASE_URL}/api/webhooks/blaaiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-blaaiz-signature': simData.signature },
      body: JSON.stringify(simData.payload),
    });
    const replayData = await replayRes.json();
    assert(replayRes.ok && replayData.duplicate === true, 'Replayed webhook event is deduplicated');

    // Regression: payout of a milestone that was never submitted is refused
    const earlyPayout = await fetch(`${BASE_URL}/api/blaaiz/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contractId: fundedContract.id, milestoneId: fundedContract.milestones[1].id }),
    });
    assert(earlyPayout.status === 409, 'Payout before deliverable submission is refused (HTTP 409)');

    // Regression: PATCH cannot be used to self-approve / mark milestones as paid
    const forgeRes = await fetch(`${BASE_URL}/api/contracts/${fundedContract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', milestones: fundedContract.milestones.map((m) => ({ ...m, status: 'DISBURSED' })) }),
    });
    assert(forgeRes.status === 400, 'PATCH cannot mark milestones DISBURSED / change contract status');
    const unsafeUrl = await fetch(`${BASE_URL}/api/contracts/${fundedContract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestones: [{ id: fundedContract.milestones[1].id, status: 'SUBMITTED', submissionUrl: 'javascript:alert(1)' }] }),
    });
    assert(unsafeUrl.status === 400, 'javascript: submission URLs are rejected');

    // TEST 5: Deliverable Submission
    console.log('\n▶ [4/4] Testing Milestone Deliverables, Payouts & Audit Stream...');
    const ms1 = fundedContract.milestones[0];
    const submitRes = await fetch(`${BASE_URL}/api/contracts/${fundedContract.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        milestones: fundedContract.milestones.map((m, idx) =>
          idx === 0
            ? {
                ...m,
                status: 'SUBMITTED',
                submissionUrl: 'https://github.com/apex-global/remit-app/pull/99',
              }
            : m
        ),
      }),
    });
    assert(submitRes.ok, 'Contractor deliverable submission saved');

    // TEST 6: Instant Blaaiz Payout Release
    const payoutRes = await fetch(`${BASE_URL}/api/blaaiz/payout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractId: fundedContract.id,
        milestoneId: ms1.id,
      }),
    });

    assert(payoutRes.ok, 'POST /api/blaaiz/payout succeeded');
    const payoutData = await payoutRes.json();
    assert(payoutData.payout.status === 'SUCCESSFUL', 'Payout status is SUCCESSFUL');
    assert(payoutData.payout.blaaizRef.startsWith('blz_disburse_'), 'Dispatched with Blaaiz settlement reference');
    assert(payoutData.payout.amount > 0, `Disbursed ${payoutData.payout.amount.toLocaleString()} ${payoutData.payout.currency} to Zenith Bank`);

    // Regression: double-clicking / replaying the payout must NOT pay twice
    const [dupA, dupB] = await Promise.all([
      fetch(`${BASE_URL}/api/blaaiz/payout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractId: fundedContract.id, milestoneId: ms1.id }) }),
      fetch(`${BASE_URL}/api/blaaiz/payout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contractId: fundedContract.id, milestoneId: ms1.id }) }),
    ]);
    assert(dupA.status === 409 && dupB.status === 409, 'Repeat payout of a disbursed milestone is refused (HTTP 409)');

    // Verify milestone is DISBURSED
    const finalContractRes = await fetch(`${BASE_URL}/api/contracts/${fundedContract.id}`);
    const finalContractData = await finalContractRes.json();
    assert(
      finalContractData.contract.milestones[0].status === 'DISBURSED',
      'Milestone 1 marked as DISBURSED'
    );
    assert(
      finalContractData.contract.milestones[0].payoutRef !== undefined,
      'Milestone contains on-chain/banking payout receipt'
    );

    // TEST 7: Activity Log Recording
    const logsRes = await fetch(`${BASE_URL}/api/logs`);
    const logsData = await logsRes.json();
    assert(logsData.logs.length > 5, 'Real-time audit log captured all lifecycle events');
    const hasPayoutLog = logsData.logs.some((l) => l.type === 'PAYOUT_DISBURSED');
    assert(hasPayoutLog, 'PAYOUT_DISBURSED recorded in Blaaiz audit stream');

    // TEST 8: Test Connection Endpoint (Simulation & Dev verification)
    const testConnRes = await fetch(`${BASE_URL}/api/blaaiz/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(testConnRes.ok, 'POST /api/blaaiz/test-connection responds properly');
    const testConnData = await testConnRes.json();
    assert(testConnData.baseUrl === 'https://api-dev.blaaiz.com', 'Test connection target is https://api-dev.blaaiz.com');

  } catch (error) {
    console.error('Test execution error:', error);
    failedTests++;
  } finally {
    console.log('\n======================================================');
    console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('======================================================\n');
    server.kill();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests();
