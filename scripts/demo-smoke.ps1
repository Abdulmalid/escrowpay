# EscrowPay Global demo smoke test.
# Exercises the full milestone lifecycle against a running dev server.
# Usage: npm run dev -- --port 3100  (in another shell)
#        powershell -File scripts/demo-smoke.ps1 -BaseUrl http://localhost:3100
param([string]$BaseUrl = "http://localhost:3100")

$ErrorActionPreference = "Stop"
$failures = 0

function Check([string]$name, [bool]$condition, [string]$detail = "") {
  if ($condition) { Write-Host "PASS  $name" }
  else {
    $script:failures += 1
    Write-Host "FAIL  $name  $detail"
  }
}

function Post([string]$path, $body, $session, [hashtable]$headers = @{}) {
  $params = @{
    Uri = "$BaseUrl$path"; Method = "POST"
    ContentType = "application/json"; Body = ($body | ConvertTo-Json -Depth 8)
  }
  if ($session) { $params["WebSession"] = $session }
  if ($headers.Count -gt 0) { $params["Headers"] = $headers }
  return Invoke-RestMethod @params
}

function Get([string]$path, $session) {
  return Invoke-RestMethod -Uri "$BaseUrl$path" -Method GET -WebSession $session
}

# 1. Health + landing
$health = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET
Check "health endpoint" ($health.ok -eq $true -and $health.data.simulated -eq $true)
$landing = Invoke-WebRequest -Uri "$BaseUrl/" -Method GET
Check "landing renders" ($landing.StatusCode -eq 200 -and $landing.Content -match "EscrowPay Global")

# 2. Reset to seed state, then log in both personas
$reset = Post "/api/demo/reset" @{} $null
Check "demo reset" ($reset.ok -eq $true)
$clientSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$freelancerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Post "/api/auth/demo-login" @{ email = "client@escrowpay.demo" } $clientSession | Out-Null
Post "/api/auth/demo-login" @{ email = "freelancer@escrowpay.demo" } $freelancerSession | Out-Null
Check "persona login" ($clientSession.Cookies.Count -gt 0 -and $freelancerSession.Cookies.Count -gt 0)

# 3. Auth gate: unauthenticated API call is rejected
try {
  Invoke-RestMethod -Uri "$BaseUrl/api/contracts" -Method GET | Out-Null
  Check "auth gate" $false "(anonymous read allowed)"
} catch {
  Check "auth gate" ($_.Exception.Response.StatusCode.value__ -eq 401)
}

# 4. Create a contract (milestones must sum to total)
$create = Post "/api/contracts" @{
  title = "Smoke test build"
  description = "End-to-end smoke test contract for verification"
  currency = "USD"
  freelancerEmail = "freelancer@escrowpay.demo"
  milestones = @(
    @{ title = "Alpha"; description = "Alpha deliverable work"; requirements = "Ship alpha"; amountMinor = 100000 },
    @{ title = "Beta"; description = "Beta deliverable work"; requirements = "Ship beta"; amountMinor = 50000 }
  )
} $clientSession
$contractId = $create.data.contract.id
$m1 = $create.data.milestones[0].id
$m2 = $create.data.milestones[1].id
Check "contract created" ($create.ok -and $create.data.contract.totalMinor -eq 150000)

# 5. Negative: mismatched total is rejected
try {
  Post "/api/contracts" @{
    title = "Bad totals"; description = "Mismatched milestone totals here"
    currency = "USD"; freelancerEmail = "freelancer@escrowpay.demo"; totalMinor = 999
    milestones = @(@{ title = "X1"; description = "Bad milestone"; amountMinor = 100 })
  } $clientSession | Out-Null
  Check "total validation" $false "(bad total accepted)"
} catch { Check "total validation" $true }

# 6. Fund M1, then confirm via the demo webhook receiver
$fundKey = [guid]::NewGuid().ToString()
$fund = Post "/api/milestones/$m1/fund" @{ idempotencyKey = $fundKey } $clientSession
$ref = $fund.data.funding.providerRef
Check "funding intent pending" ($fund.data.funding.status -eq "pending")
$replay = Post "/api/milestones/$m1/fund" @{ idempotencyKey = $fundKey } $clientSession
Check "fund idempotency" ($replay.data.funding.id -eq $fund.data.funding.id)
$eventId = [guid]::NewGuid().ToString()
$hook = Post "/api/webhooks/demo" @{
  event = "demo.funding.confirmed"; event_id = $eventId
  data = @{ provider_ref = $ref; status = "SUCCESSFUL" }
} $null @{ "x-demo-signature" = "demo" }
Check "funding webhook applied" ($hook.applied -eq $true)
$dup = Post "/api/webhooks/demo" @{
  event = "demo.funding.confirmed"; event_id = $eventId
  data = @{ provider_ref = $ref; status = "SUCCESSFUL" }
} $null @{ "x-demo-signature" = "demo" }
Check "webhook dedupe" ($dup.duplicate -eq $true)
$m1state = (Get "/api/milestones/$m1" $clientSession).data.milestone.status
Check "milestone funded" ($m1state -eq "funded") "(got $m1state)"

# 7. Freelancer works, submits; Guardian auto-reviews
Post "/api/milestones/$m1/start" @{} $freelancerSession | Out-Null
$submit = Post "/api/milestones/$m1/submit" @{
  evidenceText = "Alpha shipped: endpoints live, docs updated, tests green and reviewed."
  evidenceUrls = @("https://example.com/alpha")
  prReference = "demo#1"; testSummary = "12 tests pass"
  idempotencyKey = [guid]::NewGuid().ToString()
} $freelancerSession
Check "submit + guardian" ($submit.data.verification.verdict -in @("READY", "NEEDS_WORK", "UNCERTAIN"))
$m1state = (Get "/api/milestones/$m1" $clientSession).data.milestone.status
Check "milestone under review" ($m1state -eq "under_review") "(got $m1state)"

# 8. Negative: freelancer cannot approve
try {
  Post "/api/milestones/$m1/approve" @{} $freelancerSession | Out-Null
  Check "payer-only approve" $false "(freelancer approved)"
} catch { Check "payer-only approve" $true }

# 9. Approve, release, settle payout
Post "/api/milestones/$m1/approve" @{} $clientSession | Out-Null
$release = Post "/api/milestones/$m1/release" @{ idempotencyKey = [guid]::NewGuid().ToString() } $clientSession
$payRef = $release.data.payout.providerRef
Check "release creates payout" ($release.data.payout.status -eq "processing")
Post "/api/webhooks/demo" @{
  event = "demo.payout.completed"; event_id = [guid]::NewGuid().ToString()
  data = @{ provider_ref = $payRef; status = "SUCCESSFUL" }
} $null @{ "x-demo-signature" = "demo" } | Out-Null
$m1state = (Get "/api/milestones/$m1" $clientSession).data.milestone.status
Check "milestone released" ($m1state -eq "released") "(got $m1state)"

# 10. Ledger + FX quote
$ledger = (Get "/api/contracts/$contractId" $clientSession).data.ledger
Check "ledger entries exist" ($ledger.Count -ge 4) "(got $($ledger.Count))"
$fx = Invoke-RestMethod -Uri "$BaseUrl/api/fx/quote?base=USD&quote=NGN&amountMinor=100000" -Method GET -WebSession $clientSession
Check "indicative FX quote" ($fx.data.quote.indicative -eq $true -and [long]$fx.data.estimate.netMinor -gt 0)

# 11. Dispute branch on M2, then resume
$fund2 = Post "/api/milestones/$m2/fund" @{ idempotencyKey = [guid]::NewGuid().ToString() } $clientSession
Post "/api/webhooks/demo" @{
  event = "demo.funding.confirmed"; event_id = [guid]::NewGuid().ToString()
  data = @{ provider_ref = $fund2.data.funding.providerRef; status = "SUCCESSFUL" }
} $null @{ "x-demo-signature" = "demo" } | Out-Null
$dispute = Post "/api/disputes" @{
  milestoneId = $m2; reason = "Smoke test dispute: scope question on beta."
  idempotencyKey = [guid]::NewGuid().ToString()
} $freelancerSession
$m2state = (Get "/api/milestones/$m2" $clientSession).data.milestone.status
Check "dispute pauses milestone" ($m2state -eq "disputed") "(got $m2state)"
Post "/api/disputes/$($dispute.data.dispute.id)/resolve" @{ decision = "resume"; resolution = "Scope clarified; resume work." } $clientSession | Out-Null
$m2state = (Get "/api/milestones/$m2" $clientSession).data.milestone.status
Check "dispute resolve resumes" ($m2state -eq "in_progress") "(got $m2state)"

Write-Host ""
if ($failures -eq 0) { Write-Host "SMOKE RESULT: ALL CHECKS PASSED" } else { Write-Host "SMOKE RESULT: $failures CHECK(S) FAILED"; exit 1 }
