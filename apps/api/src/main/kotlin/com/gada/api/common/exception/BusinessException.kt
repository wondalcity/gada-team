package com.gada.api.common.exception

import org.springframework.http.HttpStatus

open class BusinessException(
    override val message: String,
    val errorCode: String,
    val status: HttpStatus = HttpStatus.BAD_REQUEST,
) : RuntimeException(message)

class NotFoundException(
    resource: String,
    id: Any? = null,
) : BusinessException(
    message = if (id != null) "${resource}($id)을 찾을 수 없습니다." else "${resource}을 찾을 수 없습니다.",
    errorCode = "NOT_FOUND",
    status = HttpStatus.NOT_FOUND,
)

class UnauthorizedException(
    message: String = "인증이 필요합니다.",
) : BusinessException(message, "UNAUTHORIZED", HttpStatus.UNAUTHORIZED)

class ForbiddenException(
    message: String = "권한이 없습니다.",
) : BusinessException(message, "FORBIDDEN", HttpStatus.FORBIDDEN)

class ConflictException(
    message: String,
    errorCode: String = "CONFLICT",
) : BusinessException(message, errorCode, HttpStatus.CONFLICT)
