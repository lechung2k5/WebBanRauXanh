package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.CategoryRequest;
import com.btl.webbanrau.dto.response.CategoryResponse;
import com.btl.webbanrau.model.Category;
import com.btl.webbanrau.repository.CategoryRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final com.btl.webbanrau.repository.HarvestLotRepository harvestLotRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll(Sort.by(Sort.Direction.ASC, "displayOrder").and(Sort.by(Sort.Direction.ASC, "id"))).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category c = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục ID: " + id));
        return mapToResponse(c);
    }

    @Transactional(readOnly = true)
    public CategoryResponse getCategoryBySlug(String slug) {
        Category c = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục với slug: " + slug));
        return mapToResponse(c);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse createCategory(CategoryRequest request) {
        if (categoryRepository.existsByName(request.getName().trim())) {
            throw new IllegalArgumentException("Tên danh mục đã tồn tại!");
        }

        String baseSlug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(request.getName());
        String slug = baseSlug;
        int count = 1;
        while (categoryRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + count++;
        }

        Category category = Category.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .build();

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục!"));

        String baseSlug = (request.getSlug() != null && !request.getSlug().isBlank())
                ? SlugUtil.toSlug(request.getSlug())
                : SlugUtil.toSlug(request.getName());
        String slug = baseSlug;
        int count = 1;
        while (categoryRepository.existsBySlug(slug) && !slug.equals(category.getSlug())) {
            slug = baseSlug + "-" + count++;
        }

        category.setName(request.getName().trim());
        category.setSlug(slug);
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(Long id) {
        long count = productRepository.countByCategoryId(id);
        long lotCount = harvestLotRepository.countByCategoryId(id);
        if (count > 0 || lotCount > 0) {
            throw new IllegalStateException("Không thể xóa danh mục đang có " + (count + lotCount) + " nông sản hoặc lô hàng liên kết!");
        }
        categoryRepository.deleteById(id);
    }

    private CategoryResponse mapToResponse(Category c) {
        long count = harvestLotRepository.countByCategoryIdAndStatus(c.getId(), "OPEN");
        if (count == 0) {
            long total = harvestLotRepository.countByCategoryId(c.getId());
            if (total == 0) {
                count = productRepository.countByCategoryId(c.getId());
            }
        }
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .description(c.getDescription())
                .imageUrl(c.getImageUrl())
                .displayOrder(c.getDisplayOrder() != null ? c.getDisplayOrder() : 0)
                .productCount((int) count)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
