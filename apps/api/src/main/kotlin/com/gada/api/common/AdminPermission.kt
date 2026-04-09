package com.gada.api.common

import com.gada.api.common.exception.ForbiddenException
import com.gada.api.domain.user.AdminRole
import com.gada.api.domain.user.UserRole
import com.gada.api.infrastructure.persistence.user.UserRepository
import org.springframework.stereotype.Component

@Component
class AdminPermission(private val userRepository: UserRepository) {

    fun requireAdmin(userId: Long) {
        val user = userRepository.findById(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다")
        if (user.role != UserRole.ADMIN) throw ForbiddenException("관리자 권한이 필요합니다")
    }

    fun requireSuperAdmin(userId: Long) {
        val user = userRepository.findById(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다")
        if (user.role != UserRole.ADMIN) throw ForbiddenException("관리자 권한이 필요합니다")
        if (user.adminRole != AdminRole.SUPER_ADMIN) throw ForbiddenException("슈퍼 관리자 권한이 필요합니다")
    }

    fun requireAny(userId: Long, vararg allowed: AdminRole) {
        val user = userRepository.findById(userId) ?: throw ForbiddenException("사용자를 찾을 수 없습니다")
        if (user.role != UserRole.ADMIN) throw ForbiddenException("관리자 권한이 필요합니다")
        val role = user.adminRole ?: return // null admin_role = super admin by legacy
        if (role != AdminRole.SUPER_ADMIN && role !in allowed) {
            throw ForbiddenException("해당 작업 권한이 없습니다")
        }
    }
}
