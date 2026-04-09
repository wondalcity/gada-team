package com.gada.api.common

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity

/**
 * Uniform API response envelope for all endpoints.
 */
data class ApiResponse<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val errorCode: String? = null,
) {
    companion object {
        fun <T> ok(data: T): ApiResponse<T> =
            ApiResponse(success = true, data = data)

        fun <T> ok(data: T, message: String): ApiResponse<T> =
            ApiResponse(success = true, data = data, message = message)

        fun created(message: String = "Created"): ApiResponse<Nothing> =
            ApiResponse(success = true, message = message)

        fun noContent(): ApiResponse<Nothing> =
            ApiResponse(success = true)

        fun error(message: String, errorCode: String? = null): ApiResponse<Nothing> =
            ApiResponse(success = false, message = message, errorCode = errorCode)
    }
}

/** Convenience extension to wrap ApiResponse in ResponseEntity */
fun <T> ApiResponse<T>.toResponseEntity(status: HttpStatus = HttpStatus.OK): ResponseEntity<ApiResponse<T>> =
    ResponseEntity.status(status).body(this)
