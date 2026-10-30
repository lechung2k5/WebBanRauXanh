package com.btl.webbanrau.controller;

import com.btl.webbanrau.dto.response.ApiResponse;
import com.btl.webbanrau.service.*;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequiredArgsConstructor
public class PartnerPortalController {
    private final AdminBusinessService business;
    private final JdbcTemplate db;
    @GetMapping("/cold-assets/public-status") public Object coldStatus(){return ApiResponse.success(db.queryForList("select asset_code,asset_type,asset_name,current_temp,current_humidity,status from cold_assets order by id"));}
    @GetMapping("/harvest-lots/my-lots") @PreAuthorize("hasRole('FARMER')") public Object myLots(){return ApiResponse.success(db.queryForList("select * from harvest_lots where farmer_id=? order by id desc",AuthService.current().getId()));}
    @PostMapping("/farmer/lots") @PreAuthorize("hasRole('FARMER')") public Object lot(@RequestBody JsonNode n){return ApiResponse.success(business.createLot(n,AuthService.current().getId()));}
    @PostMapping("/buyer/contracts") @PreAuthorize("hasRole('BUYER')") public Object contract(@RequestBody JsonNode n){return ApiResponse.success(business.createContract(n,AuthService.current().getId()));}
    @PostMapping("/farmer/contracts/{id}/agree") @PreAuthorize("hasRole('FARMER')") public Object agree(@PathVariable long id) {
        long owner=db.queryForObject("select farmer_id from b2b_contracts where id=?",Long.class,id);
        if(owner!=AuthService.current().getId()) throw new AuthException(403,"OWNER_REQUIRED","Hợp đồng không thuộc nông trại");
        AuthService.approvedPartner(AuthService.current());
        business.transition(id,new com.fasterxml.jackson.databind.ObjectMapper().createObjectNode().put("status","AGREED"));return ApiResponse.success("Đã chấp nhận RFQ",null);
    }
    @GetMapping("/portal/contracts") @PreAuthorize("hasAnyRole('FARMER','BUYER')") public Object contracts(){long id=AuthService.current().getId();return ApiResponse.success(db.queryForList("select * from b2b_contracts where farmer_id=? or buyer_id=? order by id desc",id,id));}
    @GetMapping("/driver/shipments") @PreAuthorize("hasRole('DRIVER')") public Object driver(){return ApiResponse.success(business.shipments().stream().filter(s->Objects.equals(AdminBusinessService.asLong(s,"driver_id"),AuthService.current().getId())).toList());}
    @GetMapping("/buyer/shipments") @PreAuthorize("hasRole('BUYER')") public Object buyer(){return ApiResponse.success(db.queryForList("select s.* from shipments s join b2b_contracts c on c.id=s.contract_id where c.buyer_id=? order by s.id desc",AuthService.current().getId()));}
    @PostMapping("/buyer/shipments/{id}/epod") @PreAuthorize("hasRole('BUYER')") public Object epod(@PathVariable long id,@RequestBody JsonNode n){business.epod(id,n);return ApiResponse.success("Đã ký nhận ePOD",null);}
    @GetMapping("/hub-inspections") @PreAuthorize("hasAnyRole('WAREHOUSE_QC','ADMIN')") public Object inspections(){return ApiResponse.success(business.inspections());}
    @PostMapping("/hub-inspections") @PreAuthorize("hasAnyRole('WAREHOUSE_QC','ADMIN')") public Object inspect(@RequestBody JsonNode n){return ApiResponse.success(business.inspect(n));}
    @GetMapping("/accounting/reports") @PreAuthorize("hasAnyRole('ACCOUNTANT','ADMIN')") public Object accounting(){return ApiResponse.success(business.reports());}
}
