package com.gada.api.config

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.io.ByteArrayInputStream
import java.io.FileInputStream

@Configuration
class FirebaseConfig {

    private val log = LoggerFactory.getLogger(FirebaseConfig::class.java)

    @Value("\${firebase.service-account-path:}")
    private lateinit var serviceAccountPath: String

    @Value("\${firebase.service-account-json:}")
    private lateinit var serviceAccountJson: String

    @Value("\${firebase.project-id:gada-hiring}")
    private lateinit var projectId: String

    @Bean
    fun firebaseApp(): FirebaseApp {
        if (FirebaseApp.getApps().isNotEmpty()) {
            return FirebaseApp.getInstance()
        }

        val credentials: GoogleCredentials = when {
            serviceAccountJson.isNotBlank() -> {
                log.info("Initializing Firebase from env var (FIREBASE_SERVICE_ACCOUNT_JSON)")
                GoogleCredentials.fromStream(ByteArrayInputStream(serviceAccountJson.toByteArray()))
            }
            serviceAccountPath.isNotBlank() -> {
                log.info("Initializing Firebase from file: $serviceAccountPath")
                GoogleCredentials.fromStream(FileInputStream(serviceAccountPath))
            }
            else -> {
                log.warn("No Firebase credentials configured — using empty credentials (local dev mode, Firebase auth disabled)")
                GoogleCredentials.newBuilder().build()
            }
        }

        val options = FirebaseOptions.builder()
            .setCredentials(credentials)
            .setProjectId(projectId)
            .build()

        return FirebaseApp.initializeApp(options)
    }
}
