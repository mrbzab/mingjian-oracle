import { handleAi } from '@/lib/ai-gateway';
export async function POST(request: Request) { return handleAi(request); }
