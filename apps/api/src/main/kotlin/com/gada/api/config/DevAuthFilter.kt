package com.gada.api.config

import com.gada.api.infrastructure.persistence.user.UserRepository
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.core.annotation.Order
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * DEV ONLY — active when dev.auth.bypass=true (local profile).
 * Reads X-Dev-User-Id header and sets Security context.
 * Allows testing all authenticated endpoints without real Firebase tokens.
 */
@Component
@ConditionalOnProperty(name = ["dev.auth.bypass"], havingValue = "true")
@Order(1)  // Run before FirebaseAuthFilter
class DevAuthFilter(
    private val userRepository: UserRepository,
) : OncePerRequestFilter() {

    private val log = LoggerFactory.getLogger(DevAuthFilter::class.java)

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain
    ) {
        val devUserId = request.getHeader("X-Dev-User-Id")?.toLongOrNull()

        if (devUserId != null && SecurityContextHolder.getContext().authentication == null) {
            val user = userRepository.findById(devUserId)
            if (user != null) {
                val roleStr = user.role.name
                val principal = GadaPrincipal(
                    firebaseUid = "dev-${user.id}",
                    phone = user.phone,
                    userId = user.id,
                    role = roleStr,
                )
                val auth = UsernamePasswordAuthenticationToken(
                    principal,
                    null,
                    listOf(SimpleGrantedAuthority("ROLE_$roleStr"))
                )
                SecurityContextHolder.getContext().authentication = auth
                log.debug("[DEV_AUTH] userId={} role={}", user.id, user.role)
            }
        }

        chain.doFilter(request, response)
    }
}
