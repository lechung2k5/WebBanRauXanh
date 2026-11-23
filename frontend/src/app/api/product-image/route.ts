import { NextRequest, NextResponse } from 'next/server';
import { resolveProductImageUrl, getProductGallery } from '@/services/imageService';

/**
 * API trả về link ảnh chuẩn xác dựa vào tên sản phẩm nông sản
 * Cách dùng:
 * 1. Dùng trực tiếp trong thẻ img:
 *    <img src="/api/product-image?name=Nấm+kim+châm" /> -> Trả về redirect 307 tới ảnh thật
 * 2. Lấy link JSON:
 *    GET /api/product-image?name=Cà+rốt&format=json
 *    -> { success: true, productName: "Cà rốt", imageUrl: "...", gallery: [...] }
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const name = searchParams.get('name') || searchParams.get('q') || searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const format = searchParams.get('format');

  const imageUrl = resolveProductImageUrl(name, category);
  const gallery = getProductGallery(name);

  if (format === 'json') {
    return NextResponse.json({
      success: true,
      productName: name,
      category,
      imageUrl,
      gallery,
    });
  }

  // Chuyển hướng trình duyệt/thẻ <img> tới link ảnh chất lượng cao
  return NextResponse.redirect(imageUrl, {
    status: 307,
    headers: {
      'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
