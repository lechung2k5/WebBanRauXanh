import { Category, HarvestLot } from '@/types';

/**
 * Loại bỏ dấu tiếng Việt và ký tự đặc biệt để chuẩn hóa so sánh
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let s = String(str);
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'));
  return s;
}

/**
 * Chuẩn hóa chuỗi ngành hàng: bỏ dấu, viết thường, chỉ giữ lại chữ cái và số
 * VD: "Rau Ăn Lá" -> "rauanla", "RAU_AN_LA" -> "rauanla", "rau-an-la" -> "rauanla"
 */
export function normalizeCategoryString(val?: string | number | null): string {
  if (!val && val !== 0) return '';
  return removeVietnameseTones(String(val))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Helper chuyển đổi category sang mã định danh chuẩn (RAU_AN_LA, CU_QUA, NAM_TUOI, RAU_GIA_VI, ...)
 */
export function getCategoryCode(
  cat?: Partial<Category> | { id?: number | string; slug?: string; name?: string } | null
): string {
  if (!cat) return '';
  const id = Number(cat.id);
  const slug = (cat.slug || '').toLowerCase().trim();
  const name = (cat.name || '').toLowerCase().trim();

  // 1. Rau Ăn Lá
  if (
    id === 1 ||
    slug === 'rau-an-la' ||
    slug === 'rau-sach' ||
    slug === 'rau_an_la' ||
    name.includes('rau ăn lá') ||
    name.includes('rau an la') ||
    name.includes('rau lá')
  ) {
    return 'RAU_AN_LA';
  }

  // 2. Củ & Quả Tươi
  if (
    id === 2 ||
    slug === 'cu-qua-tuoi' ||
    slug === 'cu-qua' ||
    slug === 'cu_qua' ||
    name.includes('củ & quả') ||
    name.includes('cu & qua') ||
    name.includes('củ quả') ||
    name.includes('cu qua')
  ) {
    return 'CU_QUA';
  }

  // 3. Nấm Tươi & Hữu Cơ
  if (
    id === 3 ||
    slug === 'nam-tuoi-huu-co' ||
    slug === 'nam-tuoi' ||
    slug === 'nam_tuoi' ||
    slug === 'nam' ||
    name.includes('nấm tươi') ||
    name.includes('nam tuoi') ||
    name.includes('nấm')
  ) {
    return 'NAM_TUOI';
  }

  // 4. Rau Gia Vị & Thảo Mộc
  if (
    id === 4 ||
    slug === 'rau-gia-vi-thao-moc' ||
    slug === 'rau-gia-vi' ||
    slug === 'rau_gia_vi' ||
    slug === 'gia-vi' ||
    name.includes('gia vị') ||
    name.includes('gia vi') ||
    name.includes('thảo mộc')
  ) {
    return 'RAU_GIA_VI';
  }

  // Các danh mục tùy chỉnh khác do Admin tạo
  if (cat.slug) {
    return cat.slug.toUpperCase().replace(/[-_]+/g, '_');
  }
  if (cat.name) {
    return removeVietnameseTones(cat.name).toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  }
  return id ? `CAT_${id}` : '';
}

/**
 * Lấy CategoryCode chuẩn của một Lô hàng (HarvestLot) dựa trên:
 * 1. lot.categoryId
 * 2. lot.category / lot.categorySlug
 * 3. Fallback phân tích từ ngữ nguyên vẹn từ lot.productName
 */
export function getLotCategoryCode(
  lot: HarvestLot,
  categoryList: Category[] = []
): string {
  // 1. Thử từ lot.categoryId nếu khớp với categoryList
  if (lot.categoryId) {
    const matchedById = categoryList.find((c) => Number(c.id) === Number(lot.categoryId));
    if (matchedById) {
      const code = getCategoryCode(matchedById);
      if (code) return code;
    }
    // Mapping trực tiếp ID chuẩn 1..4
    if (Number(lot.categoryId) === 1) return 'RAU_AN_LA';
    if (Number(lot.categoryId) === 2) return 'CU_QUA';
    if (Number(lot.categoryId) === 3) return 'NAM_TUOI';
    if (Number(lot.categoryId) === 4) return 'RAU_GIA_VI';
  }

  // 2. Thử từ lot.categorySlug hoặc lot.category
  const catRaw = lot.categorySlug || lot.category || '';
  if (catRaw) {
    const rawUpper = String(catRaw).toUpperCase().replace(/[-_]/g, '');
    if (rawUpper === 'RAUANLA' || rawUpper === 'RAUSACH') return 'RAU_AN_LA';
    if (rawUpper === 'CUQUA' || rawUpper === 'CUQUATUOI') return 'CU_QUA';
    if (rawUpper === 'NAMTUOI' || rawUpper === 'NAMTUOIHHUCO' || rawUpper === 'NAM') return 'NAM_TUOI';
    if (rawUpper === 'RAUGIAVI' || rawUpper === 'GIAVI' || rawUpper === 'RAUGIAVITHAOMOC') return 'RAU_GIA_VI';

    // Thử map qua getCategoryCode
    const parsedCode = getCategoryCode({ slug: catRaw, name: catRaw });
    if (parsedCode) return parsedCode;
  }

  // 3. Fallback thông minh từ tên nông sản với regex từ ngữ nguyên vẹn
  if (lot.productName) {
    const pName = removeVietnameseTones(lot.productName).toLowerCase();

    // 3.1. Nhóm Nấm tươi (rất đặc thù)
    if (/(^|\s)nam(\s|$)/.test(pName) || pName.includes('nam ') || pName.includes('mushroom')) {
      return 'NAM_TUOI';
    }

    // 3.2. Nhóm Rau gia vị & Thảo mộc
    // Dùng regex boundary để tránh các từ như "chanh" dính "hanh", "ngọc" dính "ngo", "cà rốt/ngọt" dính "ot"
    const isSpice =
      /(^|\s)(tieu|hanh|hung|sa|gung|la lot|diep ca|kinh gioi|tia to|que|ngo gai|ngo ri|rau ngo|mui tau)(\s|$)/.test(pName) ||
      (/(^|\s)ot(\s|$)/.test(pName) && !pName.includes('ca rot') && !pName.includes('ngot')) ||
      (/(^|\s)toi(\s|$)/.test(pName) && !pName.includes('mong toi'));

    if (isSpice) {
      return 'RAU_GIA_VI';
    }

    // 3.3. Nhóm Củ & Quả tươi
    const isRootOrFruit =
      /(^|\s)(ca chua|ca rot|khoai|bi do|bi dao|muop|dua leo|dua chuot|ot chuong|su hao|bap|ngo ngot)(\s|$)/.test(pName);
    if (isRootOrFruit) {
      return 'CU_QUA';
    }

    // 3.4. Nhóm Rau ăn lá
    const isLeafy =
      /(^|\s)(cai|xa lach|muong|mong toi|bo xoi|bap cai|can tay|xoong|ngot)(\s|$)/.test(pName) ||
      pName.includes('cai ') ||
      pName.includes('xa lach');
    if (isLeafy) {
      return 'RAU_AN_LA';
    }
  }

  return 'RAU_AN_LA'; // Default fallback
}

/**
 * Lấy tên tiếng Việt chuẩn để hiển thị cho badge danh mục nông sản
 */
export function getCategoryDisplayName(
  catCode?: string | null,
  catId?: number | null,
  categories: Category[] = []
): string {
  if (catId) {
    const found = categories.find((c) => Number(c.id) === Number(catId));
    if (found) return found.name;
    if (Number(catId) === 1) return 'Rau Ăn Lá';
    if (Number(catId) === 2) return 'Củ & Quả Tươi';
    if (Number(catId) === 3) return 'Nấm Tươi & Hữu Cơ';
    if (Number(catId) === 4) return 'Rau Gia Vị & Thảo Mộc';
  }
  if (catCode) {
    const upper = catCode.toUpperCase().replace(/[-_]/g, '');
    if (upper.includes('RAUANLA') || upper.includes('RAUSACH')) return 'Rau Ăn Lá';
    if (upper.includes('CUQUA')) return 'Củ & Quả Tươi';
    if (upper.includes('NAMTUOI') || upper === 'NAM') return 'Nấm Tươi & Hữu Cơ';
    if (upper.includes('RAUGIAVI') || upper.includes('GIAVI')) return 'Rau Gia Vị & Thảo Mộc';

    const norm = normalizeCategoryString(catCode);
    const found = categories.find((c) => {
      const nName = normalizeCategoryString(c.name);
      const nSlug = normalizeCategoryString(c.slug);
      const nCode = normalizeCategoryString(getCategoryCode(c));
      return (
        nName === norm ||
        nSlug === norm ||
        nCode === norm ||
        (norm && (nName.includes(norm) || norm.includes(nName))) ||
        (norm && (nCode.includes(norm) || norm.includes(nCode)))
      );
    });
    if (found) return found.name;
  }
  return catCode || 'Nông sản';
}

/**
 * Kiểm tra xem một lô hàng nông sản (HarvestLot) có khớp với ngành hàng lọc hay không
 * Hỗ trợ đa chiều: lọc theo ID (1, 2, 3, 4), lọc theo mã code chuẩn (RAU_AN_LA, CU_QUA, NAM_TUOI, RAU_GIA_VI),
 * lọc theo slug (rau-an-la, rau-gia-vi-thao-moc...), và lọc theo tên tiếng Việt
 */
export function isLotMatchingCategory(
  lot: HarvestLot,
  filterValue?: string | number | null,
  categoryList: Category[] = []
): boolean {
  if (!filterValue || filterValue === 'ALL') return true;

  const normFilter = normalizeCategoryString(filterValue);
  if (!normFilter) return true;

  // 1. Phân giải mã danh mục mục tiêu của filter (Filter Category Code)
  let filterCode = '';
  const upperFilter = String(filterValue).toUpperCase().replace(/[-_]/g, '');
  if (upperFilter === 'RAUANLA' || upperFilter === 'RAUSACH') {
    filterCode = 'RAU_AN_LA';
  } else if (upperFilter === 'CUQUA' || upperFilter === 'CUQUATUOI') {
    filterCode = 'CU_QUA';
  } else if (upperFilter === 'NAMTUOI' || upperFilter === 'NAM' || upperFilter === 'NAMTUOIHHUCO') {
    filterCode = 'NAM_TUOI';
  } else if (
    upperFilter === 'RAUGIAVI' ||
    upperFilter === 'GIAVI' ||
    upperFilter === 'RAUGIAVITHAOMOC'
  ) {
    filterCode = 'RAU_GIA_VI';
  }

  if (!filterCode) {
    const targetCat = categoryList.find(
      (c) =>
        String(c.id) === String(filterValue) ||
        (c.slug && c.slug.toLowerCase() === String(filterValue).toLowerCase()) ||
        normalizeCategoryString(c.name) === normFilter ||
        normalizeCategoryString(c.slug) === normFilter
    );
    if (targetCat) {
      filterCode = getCategoryCode(targetCat);
    } else {
      filterCode = upperFilter;
    }
  }

  // 2. Phân giải mã danh mục của lô hàng (Lot Category Code)
  const lotCode = getLotCategoryCode(lot, categoryList);

  // 3. So sánh chuẩn xác hai mã
  if (lotCode === filterCode) {
    return true;
  }

  // 4. Nếu là danh mục tùy chỉnh ngoài 4 danh mục chuẩn
  if (lot.categoryId && String(lot.categoryId) === String(filterValue)) {
    return true;
  }

  return false;
}
