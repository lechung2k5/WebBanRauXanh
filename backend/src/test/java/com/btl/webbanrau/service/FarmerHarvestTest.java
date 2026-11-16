package com.btl.webbanrau.service;

import com.btl.webbanrau.model.*;
import com.btl.webbanrau.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class FarmerHarvestTest {
    @Mock UserRepository users;
    @Mock FarmerProfileRepository profiles;
    @Mock HarvestLotRepository lots;
    @Mock RfqNegotiationRepository rfqs;
    @Mock B2bContractRepository contracts;
    @Mock QcInspectionRepository qc;
    @Mock SettlementRepository settlements;
    @Mock org.springframework.jdbc.core.JdbcTemplate jdbc;
    @Spy @InjectMocks FarmerService service;

    private B2bContract prepare(String deposit) {
        User farmer = new User();
        farmer.setId(5L);
        doReturn(farmer).when(service).getCurrentFarmer();
        B2bContract contract = B2bContract.builder().id(10L).farmer(farmer)
                .depositStatus(deposit).fulfillmentStatus("WAITING_HARVEST").build();
        when(contracts.findById(10L)).thenReturn(Optional.of(contract));
        return contract;
    }

    @Test void paidContractPersistsHarvesting() {
        B2bContract contract = prepare("DEPOSIT_PAID");
        when(contracts.save(contract)).thenReturn(contract);
        service.startHarvest(10L);
        assertEquals("HARVESTING", contract.getFulfillmentStatus());
        verify(contracts).save(contract);
        service.startHarvest(10L);
        assertEquals("HARVESTING", contract.getFulfillmentStatus());
    }

    @Test void unpaidContractCannotStart() {
        prepare("PENDING_DEPOSIT");
        assertThrows(IllegalStateException.class, () -> service.startHarvest(10L));
        verify(contracts, never()).save(any());
    }

    @Test void otherFarmerCannotStart() {
        B2bContract contract = prepare("DEPOSIT_PAID");
        User other = new User();
        other.setId(6L);
        contract.setFarmer(other);
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> service.startHarvest(10L));
        verify(contracts, never()).save(any());
    }
}
