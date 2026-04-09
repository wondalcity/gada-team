package com.gada.api.infrastructure.sms

data class SmsResult(
    val success: Boolean,
    val providerMsgId: String? = null,
    val errorCode: String? = null,
    val errorMessage: String? = null,
)

interface SmsProvider {
    val name: String
    fun send(toPhone: String, content: String): SmsResult
}
