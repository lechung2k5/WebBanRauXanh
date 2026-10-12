package com.btl.webbanrau.service;

import com.btl.webbanrau.dto.request.ProductRequest;
import com.btl.webbanrau.dto.response.PageResponse;
import com.btl.webbanrau.dto.response.ProductResponse;
import com.btl.webbanrau.model.Category;
import com.btl.webbanrau.model.Product;
import com.btl.webbanrau.repository.CategoryRepository;
import com.btl.webbanrau.repository.ProductRepository;
import com.btl.webbanrau.util.SlugUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getProducts(
            String keyword, Long categoryId, BigDecimal minPrice, BigDecimal maxPrice,
            Boolean isOrganic, int page, int size, String sortBy, String sortDir) {

        Sort sort = "ASC".equalsIgnoreCase(sortDir) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Product> productPage = productRepository.searchProducts(
                keyword, categoryId, minPrice, maxPrice, isOrganic, pageable);

        List<ProductResponse> list = productPage.getContent().stream()
                .map(this::mapToResponse)
                .toList();

        return PageResponse.<ProductResponse>builder()
                .currentPage(productPage.getNumber())
                .totalPages(productPage.getTotalPages())
                .pageSize(productPage.getSize())
                .totalElements(productPage.getTotalElements())
                .data(list)
                .build();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getFeaturedProducts() {
        return productRepository.findByIsFeaturedTrueAndIsActiveTrue().stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm ID: " + id));
        return mapToResponse(p);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductBySlug(String slug) {
        Product p = productRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm với slug: " + slug));
        return mapToResponse(p);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục!"));

        String baseSlug = SlugUtil.toSlug(request.getName());
        String slug = baseSlug;
        int count = 1;
        while (productRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + count++;
        }

        Product product = Product.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .price(request.getPrice())
                .originalPrice(request.getOriginalPrice())
                .stockQuantity(request.getStockQuantity())
                .unit(request.getUnit() != null ? request.getUnit() : "kg")
                .imageUrl(request.getImageUrl())
                .origin(request.getOrigin())
                .isOrganic(request.getIsOrganic() != null ? request.getIsOrganic() : true)
                .isFeatured(request.getIsFeatured() != null ? request.getIsFeatured() : false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .category(category)
                .build();

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm!"));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục!"));

        product.setName(request.getName().trim());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOriginalPrice(request.getOriginalPrice());
        product.setStockQuantity(request.getStockQuantity());
        product.setUnit(request.getUnit());
        product.setImageUrl(request.getImageUrl());
        product.setOrigin(request.getOrigin());
        if (request.getIsOrganic() != null) product.setIsOrganic(request.getIsOrganic());
        if (request.getIsFeatured() != null) product.setIsFeatured(request.getIsFeatured());
        if (request.getIsActive() != null) product.setIsActive(request.getIsActive());
        product.setCategory(category);

        return mapToResponse(productRepository.save(product));
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteProduct(Long id) {
        productRepository.deleteById(id);
    }

    private ProductResponse mapToResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .slug(p.getSlug())
                .description(p.getDescription())
                .price(p.getPrice())
                .originalPrice(p.getOriginalPrice())
                .stockQuantity(p.getStockQuantity())
                .unit(p.getUnit())
                .imageUrl(p.getImageUrl())
                .origin(p.getOrigin())
                .isOrganic(p.getIsOrganic())
                .isFeatured(p.getIsFeatured())
                .isActive(p.getIsActive())
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
