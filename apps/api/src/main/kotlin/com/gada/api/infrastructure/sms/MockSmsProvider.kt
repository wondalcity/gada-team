package com.gada.api.infrastructure.sms

import org.slf4j.LoggerFactory
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

/**
 * Mock SMS provider for development/testing.
 * Active when sms.provider=mock (default).
 * In production, swap with CoolSmsProvider or NaverSmsProvider.
 */
@Component
@ConditionalOnProperty(name = ["sms.provider"], havingValue = "mock", matchIfMissing = true)
class MockSmsProvider : SmsProvider {
    private val log = LoggerFactory.getLogger(MockSmsProvider::class.java)
    override val name = "mock"

    override fun send(toPhone: String, content: String): SmsResult {
        log.info("[SMS MOCK] to={} content={}", toPhone, content.take(80))
        return SmsResult(success = true, providerMsgId = "MOCK-${System.currentTimeMillis()}")
    }
}
