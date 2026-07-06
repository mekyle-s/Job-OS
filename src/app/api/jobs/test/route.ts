import { NextResponse } from 'next/server';
import { startJobQueue } from '@/lib/jobs';
import { TEST_QUEUE, registerTestWorker } from '@/lib/jobs/workers/test-worker';

export async function POST() {
  try {
    const boss = await startJobQueue();
    await registerTestWorker(boss);

    const jobId = await boss.send(TEST_QUEUE, {
      message: 'Hello from test job!',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      jobId,
      message: 'Test job enqueued successfully',
    });
  } catch (error) {
    console.error('Failed to enqueue test job:', error);
    return NextResponse.json({ success: false, error: 'Failed to enqueue job' }, { status: 500 });
  }
}
