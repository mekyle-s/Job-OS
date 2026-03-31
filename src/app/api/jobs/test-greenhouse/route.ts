import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify Greenhouse API is working
 * Try: GET /api/jobs/test-greenhouse?company=stripe
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company') || 'stripe';

  try {
    const url = `https://boards-api.greenhouse.io/v1/boards/${company}/jobs`;
    console.log('Fetching from:', url);

    const response = await fetch(url);
    const data = await response.json();

    return NextResponse.json({
      company,
      url,
      status: response.status,
      jobCount: data.jobs?.length || 0,
      jobs: data.jobs?.slice(0, 5).map((job: any) => ({
        id: job.id,
        title: job.title,
        location: job.location?.name,
        updated_at: job.updated_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        company,
      },
      { status: 500 }
    );
  }
}
