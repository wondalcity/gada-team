package com.gada.api.presentation.v1.contract

import com.gada.api.application.contract.ContractTemplateResponse
import com.gada.api.application.contract.ContractTemplateUseCase
import com.gada.api.application.contract.UpsertContractTemplateRequest
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/employer/contracts/template")
class ContractTemplateController(private val useCase: ContractTemplateUseCase) {

    @GetMapping
    fun getTemplate(@CurrentUser principal: GadaPrincipal): ResponseEntity<ApiResponse<ContractTemplateResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(useCase.getTemplate(userId)).toResponseEntity()
    }

    @PutMapping
    fun upsertTemplate(
        @RequestBody req: UpsertContractTemplateRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ContractTemplateResponse>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(useCase.upsertTemplate(userId, req)).toResponseEntity()
    }
}
