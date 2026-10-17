'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  scrollTargetId?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 16,
  onPageChange,
  className = '',
  scrollTargetId,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const handlePageClick = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);

    if (scrollTargetId) {
      const el = document.getElementById(scrollTargetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    // Fallback scroll
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  // Thuật toán hiển thị số trang với dấu ba chấm thông minh (Smart Ellipsis)
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-[#EAECE8] ${className}`}>
      {/* Thông tin số lượng hiển thị */}
      {totalItems !== undefined && (
        <div className="text-xs text-[#6B7280]">
          Hiển thị <span className="font-bold text-[#10542C]">{startItem} - {endItem}</span> trong{' '}
          <span className="font-bold text-[#10542C]">{totalItems}</span> nông sản tươi ngon
        </div>
      )}

      {/* Cụm nút chuyển trang */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* Nút về đầu trang */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage === 1}
          title="Trang đầu tiên"
          className="p-2 rounded-xl border border-[#EAECE8] bg-white text-[#2C3E2E] hover:bg-[#F4F5F1] hover:text-[#10542C] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Nút Trang Trước */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-xl border border-[#EAECE8] bg-white text-xs font-bold text-[#2C3E2E] hover:bg-[#F4F5F1] hover:text-[#10542C] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        {/* Danh sách các số trang */}
        {pages.map((p, index) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-9 h-9 flex items-center justify-center text-xs font-bold text-[#9CA3AF] select-none"
              >
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => handlePageClick(pageNum)}
              className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'bg-[#10542C] text-white shadow-md scale-105 font-black ring-2 ring-[#10542C]/20'
                  : 'bg-white border border-[#EAECE8] text-[#2C3E2E] hover:bg-[#F4F5F1] hover:text-[#10542C] hover:border-[#10542C]/30 shadow-2xs'
              }`}
            >
              {pageNum}
            </button>
          );
        })}

        {/* Nút Trang Sau */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-xl border border-[#EAECE8] bg-white text-xs font-bold text-[#2C3E2E] hover:bg-[#F4F5F1] hover:text-[#10542C] disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Nút về trang cuối */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage === totalPages}
          title="Trang cuối cùng"
          className="p-2 rounded-xl border border-[#EAECE8] bg-white text-[#2C3E2E] hover:bg-[#F4F5F1] hover:text-[#10542C] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
