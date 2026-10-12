package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.CategoryRequest;
import com.btl.webbanrau.dto.response.CategoryResponse;
import com.btl.webbanrau.model.Category;
import com.btl.webbanrau.repository.CategoryRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
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
        if (categoryRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Tên danh mục đã tồn tại!");
        }

        Category category = Category.builder()
                .name(request.getName().trim())
                .slug(SlugUtil.toSlug(request.getName()))
                .description(request.getDescription())
                .imageUrl(request.getImageUrl())
                .build();

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục!"));

        category.setName(request.getName().trim());
        category.setSlug(SlugUtil.toSlug(request.getName()));
        category.setDescription(request.getDescription());
        category.setImageUrl(request.getImageUrl());

        return mapToResponse(categoryRepository.save(category));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteCategory(Long id) {
        categoryRepository.deleteById(id);
    }

    private CategoryResponse mapToResponse(Category c) {
        long count = productRepository.countByCategoryId(c.getId());
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .description(c.getDescription())
                .imageUrl(c.getImageUrl())
                .productCount((int) count)
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
