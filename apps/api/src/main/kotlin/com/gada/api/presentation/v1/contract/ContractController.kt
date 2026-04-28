package com.gada.api.presentation.v1.contract

import com.gada.api.application.contract.ContractDetail
import com.gada.api.application.contract.ContractSummary
import com.gada.api.application.contract.ContractUseCase
import com.gada.api.application.contract.CreateContractRequest
import com.gada.api.common.ApiResponse
import com.gada.api.common.toResponseEntity
import com.gada.api.common.exception.UnauthorizedException
import com.gada.api.config.CurrentUser
import com.gada.api.config.GadaPrincipal
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.UUID

@Tag(name = "Contracts", description = "계약서 관리")
@RestController
@RequestMapping("/api/v1/contracts")
class ContractController(private val contractUseCase: ContractUseCase) {

    // ── Worker endpoints ─────────────────────────────────────────────────────────

    @Operation(summary = "내 계약서 목록 (근로자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/mine")
    fun getMyContracts(
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<List<ContractSummary>>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(contractUseCase.getWorkerContracts(userId)).toResponseEntity()
    }

    @Operation(summary = "계약서 상세 조회 (근로자)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/{publicId}")
    fun getContract(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ContractDetail>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(contractUseCase.getWorkerContract(userId, publicId)).toResponseEntity()
    }

    @Operation(summary = "계약서 서명 (근로자)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/{publicId}/sign")
    fun signContract(
        @PathVariable publicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ContractDetail>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(contractUseCase.workerSign(userId, publicId)).toResponseEntity()
    }

    // ── Employer endpoints ───────────────────────────────────────────────────────

    @Operation(summary = "계약서 발송 (고용주 — 채용확정 후)", security = [SecurityRequirement(name = "Bearer")])
    @PostMapping("/applications/{applicationPublicId}")
    fun sendContract(
        @PathVariable applicationPublicId: UUID,
        @RequestBody req: CreateContractRequest,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ContractDetail>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(contractUseCase.createAndSend(userId, applicationPublicId, req)).toResponseEntity()
    }

    @Operation(summary = "지원서에 연결된 계약서 조회 (고용주)", security = [SecurityRequirement(name = "Bearer")])
    @GetMapping("/applications/{applicationPublicId}")
    fun getContractByApplication(
        @PathVariable applicationPublicId: UUID,
        @CurrentUser principal: GadaPrincipal,
    ): ResponseEntity<ApiResponse<ContractDetail?>> {
        val userId = principal.userId ?: throw UnauthorizedException()
        return ApiResponse.ok(contractUseCase.getEmployerContractByApplication(userId, applicationPublicId)).toResponseEntity()
    }
}
