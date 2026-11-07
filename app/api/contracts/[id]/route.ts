import { NextRequest, NextResponse } from 'next/server';
import { getContractById, mutateContract } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const contract = await getContractById(params.id);
  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }
  return NextResponse.json({ contract });
}

/**
 * The only client-driven change allowed is submitting a deliverable:
 * an ESCROWED milestone moves to SUBMITTED with an http(s) submission URL.
 * Everything else (status, amounts, payout state, hedge data...) is server-controlled.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.milestones)) {
      return NextResponse.json({ error: 'milestones array is required' }, { status: 400 });
    }

    const submissions = new Map<string, string>();
    for (const m of body.milestones) {
      if (m && m.status === 'SUBMITTED' && typeof m.id === 'string') {
        if (!isSafeHttpUrl(m.submissionUrl)) {
          throw new HttpError('submissionUrl must be a valid http(s) URL', 400);
        }
        submissions.set(m.id, m.submissionUrl);
      }
    }

    const updated = await mutateContract(params.id, (current) => {
      if (current.status !== 'ESCROWED_HEDGED' && current.status !== 'WORK_IN_PROGRESS') {
        throw new HttpError(`Contract is not funded (status: ${current.status})`, 409);
      }
      let changed = 0;
      const milestones = current.milestones.map((m) => {
        const url = submissions.get(m.id);
        if (url === undefined) return m;
        if (m.status !== 'ESCROWED') {
          throw new HttpError(`Milestone ${m.id} cannot be submitted (status: ${m.status})`, 409);
        }
        changed++;
        return { ...m, status: 'SUBMITTED' as const, submissionUrl: url, submittedAt: new Date().toISOString() };
      });
      if (changed !== submissions.size) throw new HttpError('Unknown milestone id', 404);
      if (changed === 0) throw new HttpError('No deliverable submission found in request', 400);
      return { ...current, milestones };
    });

    if (!updated) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, contract: updated });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Contract update error:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}
