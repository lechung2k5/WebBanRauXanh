import { NextRequest } from 'next/server';
import { GET as handleProductImage } from '../product-image/route';

export async function GET(request: NextRequest) {
  return handleProductImage(request);
}
