package com.changelogai.controller;

import com.changelogai.dto.response.ApiResponse;
import com.changelogai.service.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @PostMapping("/github")
    public ResponseEntity<ApiResponse<Void>> handleGitHubWebhook(
            @RequestHeader(value = "X-GitHub-Event", required = false) String event,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestHeader(value = "X-GitHub-Delivery", required = false) String deliveryId,
            @RequestBody Map<String, Object> payload) {

        log.info("Received GitHub webhook: event={}, delivery={}", event, deliveryId);

        if ("push".equals(event)) {
            webhookService.handlePushEvent(payload);
        } else if ("create".equals(event)) {
            webhookService.handleTagEvent(payload);
        }

        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
