'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useApp } from '@/context/AppContext';
import {
  Utensils,
  Soup,
  Flame,
  Salad,
  Clock,
  Users,
  ChevronRight,
  ShoppingCart,
  CheckCircle2,
  Sparkles,
  ChefHat,
  Leaf,
} from 'lucide-react';

interface Recipe {
  id: string;
  name: string;
  category: 'soup' | 'stirfry' | 'salad' | 'stew';
  time: string;
  servings: string;
  difficulty: string;
  image: string;
  description: string;
  steps: string[];
  ingredients: {
    name: string;
    amount: string;
    price: number;
    productId: string;
    imageUrl: string;
  }[];
}

const RECIPES: Recipe[] = [
  {
    id: 'canh-mong-toi-cua',
    name: 'Canh Cua Rau Mồng Tơi & Mướp Hương',
    category: 'soup',
    time: '25 phút',
    servings: '3-4 người',
    difficulty: 'Dễ',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    description: 'Bát canh dân dã mát lành, vị ngọt thanh từ cua đồng và mướp hương xua tan nắng nóng mùa hè.',
    steps: [
      'Rửa sạch mồng tơi, mướp hương gọt vỏ thái vát chéo.',
      'Đun sôi nước cua đồng với chút muối, vớt nhẹ váng thịt cua sang bát riêng.',
      'Cho mướp và rau mồng tơi vào nước canh, đun sôi trong 3 phút.',
      'Nêm nếm gia vị vừa ăn, trút thịt cua lại vào nồi rồi tắt bếp thưởng thức.'
    ],
    ingredients: [
      { name: 'Rau mồng tơi', amount: '1 gói 400g', price: 8000, productId: 'Rau-3', imageUrl: 'https://images.unsplash.com/photo-1597362925123-77861d3fbac7?w=400&auto=format&fit=crop&q=80' },
      { name: 'Mướp hương', amount: '1 trái 400g', price: 13000, productId: 'Cu-9', imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'canh-nam-duong-sinh',
    name: 'Canh Nấm Dưỡng Sinh Thập Cẩm',
    category: 'soup',
    time: '20 phút',
    servings: '4 người',
    difficulty: 'Dễ',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
    description: 'Thanh lọc cơ thể với canh nấm đông cô tươi kết hợp nấm kim châm ngọt giòn tự nhiên.',
    steps: [
      'Nấm kim châm cắt gốc, rửa sạch để ráo. Nấm đông cô thái lát vừa ăn.',
      'Phi thơm hành boa-rô, cho cà rốt và nấm đông cô vào xào sơ.',
      'Thêm 800ml nước dùng rau củ, đun sôi lăn tăn trong 10 phút.',
      'Thả nấm kim châm vào nấu thêm 2 phút, rắc ngò rí và tiêu xay thơm nức.'
    ],
    ingredients: [
      { name: 'Nấm kim châm', amount: '1 gói 150g', price: 12000, productId: 'Nam-1', imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80' },
      { name: 'Nấm hương tươi', amount: '1 gói 150g', price: 22000, productId: 'Nam-5', imageUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=400&auto=format&fit=crop&q=80' },
      { name: 'Cà rốt Đà Lạt', amount: '1 củ', price: 14000, productId: 'Cu-8', imageUrl: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'cai-thia-xao-dau-hao',
    name: 'Cải Thìa Sốt Dầu Hào Tỏi Phi',
    category: 'stirfry',
    time: '12 phút',
    servings: '2-3 người',
    difficulty: 'Rất dễ',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80',
    description: 'Cọng cải thìa xanh mướt, cắn giòn sần sật quyện nước sốt dầu hào bóng bẩy thơm nức tỏi phi.',
    steps: [
      'Cải thìa chẻ đôi, chần sơ qua nước sôi có pha chút muối và dầu ăn rồi vớt ngâm nước đá.',
      'Phi thơm 3 tép tỏi đập dập với dầu ăn cho vàng giòn.',
      'Pha sốt: 2 thìa dầu hào, 1 thìa xì dầu, 1/2 thìa đường và 2 thìa nước lọc.',
      'Đảo nhanh cải thìa trên lửa lớn với nước sốt trong 1 phút, trút ra đĩa rắc tỏi phi.'
    ],
    ingredients: [
      { name: 'Cải thìa VietGAP', amount: '1 gói 300g', price: 9500, productId: 'Rau-8', imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&auto=format&fit=crop&q=80' },
      { name: 'Tỏi tím', amount: '1 túi 200g', price: 18000, productId: 'Cu-19', imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'nam-dui-ga-xao-bo',
    name: 'Nấm Đùi Gà Baby Xào Tiêu Đen',
    category: 'stirfry',
    time: '15 phút',
    servings: '3-4 người',
    difficulty: 'Dễ',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    description: 'Nấm đùi gà baby dai ngọt như thịt gà, vị cay nồng tiêu đen đậm đà đưa cơm.',
    steps: [
      'Nấm đùi gà baby rửa sạch, khía vảy rồng nhẹ trên thân nấm.',
      'Ướp nấm với xì dầu, dầu hào, tiêu đen đập dập trong 5 phút.',
      'Phi thơm hành tỏi băm, đảo nấm trên chảo nóng đến khi xém cạnh thơm nức.',
      'Thêm hành lá và ớt chuông thái sợi đảo đều rồi tắt bếp.'
    ],
    ingredients: [
      { name: 'Nấm đùi gà baby', amount: '1 gói 200g', price: 19000, productId: 'Nam-4', imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&auto=format&fit=crop&q=80' },
      { name: 'Ớt chuông 3 màu', amount: '1 gói 300g', price: 25000, productId: 'Cu-15', imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'salad-thuy-canh-ca-chua',
    name: 'Salad Xà Lách Thủy Tinh & Cà Chua Beef',
    category: 'salad',
    time: '10 phút',
    servings: '2 người',
    difficulty: 'Rất dễ',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80',
    description: 'Món khai vị giòn tan thanh mát, dồi dào chất chống oxy hóa và vitamin tươi trẻ.',
    steps: [
      'Xà lách rửa sạch, xé miếng vừa ăn, để ráo nước.',
      'Cà chua beef thái lát mỏng khoanh tròn, dưa leo thái lát xéo.',
      'Pha nước sốt dầu giấm: 2 thìa giấm táo, 1 thìa dầu ô-liu, 1 thìa mật ong, chút muối tiêu.',
      'Trộn đều các loại rau củ với nước sốt ngay trước khi ăn để giữ trọn độ giòn.'
    ],
    ingredients: [
      { name: 'Xà lách thủy tinh', amount: '1 cây 200g', price: 18000, productId: 'Rau-21', imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=400&auto=format&fit=crop&q=80' },
      { name: 'Cà chua beef', amount: '1 túi 500g', price: 32000, productId: 'Cu-7', imageUrl: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=400&auto=format&fit=crop&q=80' },
      { name: 'Dưa leo', amount: '1 túi 1kg', price: 15000, productId: 'Cu-10', imageUrl: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400&auto=format&fit=crop&q=80' },
    ],
  },
  {
    id: 'kho-quet-rau-luoc',
    name: 'Kho Quẹt Nam Bộ Chấm Thập Cẩm Rau Luộc',
    category: 'stew',
    time: '25 phút',
    servings: '4 người',
    difficulty: 'Trung bình',
    image: 'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=600&auto=format&fit=crop&q=80',
    description: 'Nồi kho quẹt kẹo ngọt mặn mòi, tôm khô thịt mỡ chấm cùng các loại củ quả luộc xanh mướt.',
    steps: [
      'Luộc chín tới các loại rau củ: đậu cove, bắp cải, cà rốt, khổ qua trong nước sôi có muối.',
      'Vớt ra ngâm ngay vào âu nước đá để rau giữ màu xanh tươi và độ giòn ngọt.',
      'Thịt ba chỉ thái hạt lựu rán vàng giòn, trút mỡ thừa.',
      'Nấu nước mắm, đường, tôm khô ngâm mềm liu riu đến khi sánh kẹo, thả ớt hiểm và tiêu xanh.'
    ],
    ingredients: [
      { name: 'Đậu cove Đà Lạt', amount: '1 gói 300g', price: 16000, productId: 'Cu-14', imageUrl: 'https://images.unsplash.com/photo-1591857177580-dc82b9ac4e1e?w=400&auto=format&fit=crop&q=80' },
      { name: 'Bắp cải trái tim', amount: '1 trái 600g', price: 20000, productId: 'Cu-11', imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=400&auto=format&fit=crop&q=80' },
      { name: 'Khổ qua', amount: '1 túi 500g', price: 17000, productId: 'Cu-12', imageUrl: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&auto=format&fit=crop&q=80' },
    ],
  },
];

export default function RecipesPage() {
  const { addToCart, setIsCartOpen } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'soup' | 'stirfry' | 'salad' | 'stew'>('all');
  const [activeRecipe, setActiveRecipe] = useState<Recipe>(RECIPES[0]);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const filteredRecipes = selectedCategory === 'all'
    ? RECIPES
    : RECIPES.filter((r) => r.category === selectedCategory);

  const handleAddComboToCart = (recipe: Recipe) => {
    recipe.ingredients.forEach((ing) => {
      addToCart(
        {
          id: ing.productId,
          name: ing.name,
          slug: ing.productId,
          price: ing.price,
          unit: ing.amount,
          imageUrl: ing.imageUrl,
          stockQuantity: 100,
          description: `Nguyên liệu nấu món: ${recipe.name}`,
          isOrganic: true,
          isFeatured: false,
          isActive: true,
        },
        1
      );
    });
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F9F9F5] flex flex-col justify-between">
      <Header />

      <main className="max-w-[1240px] mx-auto px-4 py-8 w-full flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#6B7280] mb-6">
          <Link href="/" className="hover:text-[#10542C]">Trang chủ</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-[#10542C] font-bold">Hôm nay ăn gì?</span>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-[#10542C] to-[#1B7A3E] rounded-3xl p-8 sm:p-10 text-white mb-10 shadow-lg relative overflow-hidden">
          <div className="max-w-xl relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-xs text-[#8BC34A] text-xs font-bold px-3 py-1 rounded-full mb-3">
              <ChefHat className="w-4 h-4" /> Bếp Nhà Xanh
            </span>
            <h1 className="font-heading text-3xl sm:text-4xl font-black leading-tight mb-3">
              Hôm Nay Ăn Gì? Gợi Ý Mâm Cơm Thanh Lành
            </h1>
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">
              Không còn loay hoay nghĩ thực đơn mỗi ngày. Chọn món ngon yêu thích, 1 click mua trọn combo nguyên liệu tươi sạch giao ngay tận bếp!
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8">
          {[
            { id: 'all', label: 'Tất cả món ngon', icon: Utensils },
            { id: 'soup', label: 'Canh thanh mát', icon: Soup },
            { id: 'stirfry', label: 'Món xào giòn ngọt', icon: Flame },
            { id: 'salad', label: 'Salad & Gỏi', icon: Salad },
            { id: 'stew', label: 'Món kho & om', icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#10542C] text-white shadow-md'
                    : 'bg-white border border-[#EAECE8] text-[#2C3E2E] hover:bg-[#F4F5F1]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8BC34A]' : 'text-[#10542C]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Layout 2 Cột: Danh Sách Món (Trái) & Chi Tiết Món Đang Xem (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột Trái: Danh Sách Thẻ Món Ăn (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {filteredRecipes.map((r) => {
              const isSelected = activeRecipe.id === r.id;
              const comboPrice = r.ingredients.reduce((sum, item) => sum + item.price, 0);
              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRecipe(r)}
                  className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all cursor-pointer flex gap-4 ${
                    isSelected
                      ? 'border-[#10542C] shadow-md ring-2 ring-[#8BC34A]/30'
                      : 'border-[#EAECE8] hover:border-[#10542C]/40 hover:shadow-xs'
                  }`}
                >
                  <img
                    src={r.image}
                    alt={r.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-2xl bg-[#F9F9F5] shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-[#6B7280] mb-1">
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3 h-3 text-[#10542C]" /> {r.time}
                        </span>
                        <span>•</span>
                        <span>{r.servings}</span>
                      </div>
                      <h3 className="font-heading font-bold text-sm text-[#2C3E2E] line-clamp-2">
                        {r.name}
                      </h3>
                      <p className="text-[11px] text-[#6B7280] mt-1 line-clamp-1">{r.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#F0F2ED] mt-2">
                      <div>
                        <span className="text-[10px] text-[#6B7280]">Combo nguyên liệu:</span>
                        <p className="font-heading font-black text-xs text-[#10542C]">{formatVND(comboPrice)}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#10542C] hover:underline flex items-center gap-1">
                        Xem công thức <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cột Phải: Khung Chi Tiết Công Thức & Mua Combo (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-[#EAECE8] shadow-xs space-y-6 lg:sticky lg:top-24">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#F9F9F5]">
              <img
                src={activeRecipe.image}
                alt={activeRecipe.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-white leading-tight">
                    {activeRecipe.name}
                  </h2>
                  <div className="flex items-center gap-3 text-white/80 text-xs mt-2 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeRecipe.time}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {activeRecipe.servings}</span>
                    <span>•</span>
                    <span>Độ khó: {activeRecipe.difficulty}</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed italic border-l-2 border-[#10542C] pl-3">
              "{activeRecipe.description}"
            </p>

            {/* Khối Nguyên Liệu Tươi Chuẩn Bị & Nút Mua Trọn Combo */}
            <div className="p-5 rounded-2xl bg-[#F9F9F5] border border-[#EAECE8] space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECE8] pb-3">
                <h3 className="font-heading font-bold text-sm text-[#10542C] flex items-center gap-2">
                  <Leaf className="w-4 h-4 text-[#8BC34A]" /> Nguyên Liệu Tươi Cần Dùng ({activeRecipe.ingredients.length} món)
                </h3>
                <span className="font-heading font-black text-sm text-[#10542C]">
                  {formatVND(activeRecipe.ingredients.reduce((s, i) => s + i.price, 0))}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeRecipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-[#EAECE8]">
                    <img
                      src={ing.imageUrl}
                      alt={ing.name}
                      className="w-10 h-10 object-cover rounded-lg bg-[#F9F9F5]"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.includes('unsplash')) {
                          target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80';
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-[#2C3E2E] truncate">{ing.name}</p>
                      <p className="text-[10px] text-[#6B7280]">{ing.amount} • {formatVND(ing.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleAddComboToCart(activeRecipe)}
                className="w-full py-3.5 bg-[#10542C] hover:bg-[#0C3E20] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4 text-[#8BC34A]" /> Thêm Trọn Combo Này Vào Giỏ Hàng
              </button>
            </div>

            {/* Các bước thực hiện */}
            <div>
              <h3 className="font-heading font-bold text-sm text-[#2C3E2E] mb-3 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-[#10542C]" /> Hướng Dẫn Nấu Từng Bước
              </h3>
              <ol className="space-y-2.5 text-xs text-[#2C3E2E]">
                {activeRecipe.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#D7EED6] text-[#10542C] font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
