package com.gada.api.config

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.Date

@Service
class JwtService {

    @Value("\${app.jwt.secret:gada-hiring-jwt-secret-key-change-in-production-please}")
    private lateinit var secret: String

    @Value("\${app.jwt.expiry-days:30}")
    private var expiryDays: Long = 30

    private val ISSUER = "gada-hiring"

    private val key by lazy {
        // HMAC-SHA256 requires at least 32 bytes
        Keys.hmacShaKeyFor(secret.padEnd(32, '0').toByteArray(Charsets.UTF_8))
    }

    fun generateToken(userId: Long, phone: String, role: String): String {
        val now = System.currentTimeMillis()
        return Jwts.builder()
            .issuer(ISSUER)
            .subject(userId.toString())
            .claim("phone", phone)
            .claim("role", role)
            .issuedAt(Date(now))
            .expiration(Date(now + expiryDays * 86_400_000L))
            .signWith(key)
            .compact()
    }

    /**
     * Returns null if the token is invalid or was not issued by us.
     */
    fun parseToken(token: String): TokenClaims? = runCatching {
        val claims = Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
        if (claims.issuer != ISSUER) return null
        TokenClaims(
            userId = claims.subject.toLong(),
            phone = claims["phone"] as? String ?: "",
            role = claims["role"] as? String,
        )
    }.getOrNull()

    data class TokenClaims(
        val userId: Long,
        val phone: String,
        val role: String?,
    )
}
