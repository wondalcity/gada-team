package com.gada.api.presentation.v1.health

import com.gada.api.common.ApiResponse
import io.swagger.v3.oas.annotations.Operation
import io.swagger.v3.oas.annotations.tags.Tag
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Instant

@Tag(name = "Health", description = "서버 상태 확인")
@RestController
@RequestMapping("/api/v1")
class HealthController {

    @Operation(summary = "Health check", description = "서버 상태 및 버전 정보를 반환합니다.")
    @GetMapping("/health")
    fun health(): ResponseEntity<ApiResponse<Map<String, Any>>> =
        ResponseEntity.ok(
            ApiResponse.ok(
                mapOf(
                    "status" to "UP",
                    "service" to "gada-api",
                    "version" to "0.1.0",
                    "timestamp" to Instant.now().toString(),
                )
            )
        )
}
