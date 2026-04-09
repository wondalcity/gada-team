package com.gada.api.config

import com.fasterxml.jackson.databind.ObjectMapper
import com.querydsl.jpa.impl.JPAQueryFactory
import jakarta.persistence.EntityManager
import jakarta.persistence.PersistenceContext
import org.hibernate.cfg.AvailableSettings
import org.hibernate.type.format.jackson.JacksonJsonFormatMapper
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Lazy
import org.springframework.data.jpa.repository.config.EnableJpaAuditing

@Configuration
@EnableJpaAuditing
class JpaConfig {

    /**
     * Pass Spring's fully-configured ObjectMapper (with KotlinModule + JavaTimeModule)
     * to Hibernate so that @JdbcTypeCode(SqlTypes.JSON) on Kotlin data classes works correctly.
     */
    @Bean
    fun hibernatePropertiesCustomizer(objectMapper: ObjectMapper): HibernatePropertiesCustomizer =
        HibernatePropertiesCustomizer { hibernateProperties ->
            hibernateProperties[AvailableSettings.JSON_FORMAT_MAPPER] =
                JacksonJsonFormatMapper(objectMapper)
        }
}

/**
 * Separate configuration for QueryDSL to avoid circular dependency:
 * JpaConfig (HibernatePropertiesCustomizer) -> HibernateJpaConfiguration -> entityManagerFactory
 * The @Lazy EntityManager injection defers resolution until after the factory is fully built.
 */
@Configuration
class QueryDslConfig {

    @PersistenceContext
    @Lazy
    private lateinit var entityManager: EntityManager

    @Bean
    fun jpaQueryFactory(): JPAQueryFactory = JPAQueryFactory(entityManager)
}
