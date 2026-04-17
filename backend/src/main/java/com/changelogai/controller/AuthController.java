package com.changelogai.controller;

import com.changelogai.dto.request.LoginRequest;
import com.changelogai.dto.request.RefreshTokenRequest;
import com.changelogai.dto.request.RegisterRequest;
import com.changelogai.dto.response.ApiResponse;
import com.changelogai.dto.response.AuthResponse;
import com.changelogai.dto.response.UserResponse;
import com.changelogai.security.CustomUserDetails;
import com.changelogai.service.AuthService;
import com.changelogai.service.GitHubOAuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final GitHubOAuthService gitHubOAuthService;

    public AuthController(AuthService authService, GitHubOAuthService gitHubOAuthService) {
        this.authService = authService;
        this.gitHubOAuthService = gitHubOAuthService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        AuthResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal CustomUserDetails userDetails) {
        authService.logout(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal CustomUserDetails userDetails) {
        UserResponse response = authService.getCurrentUser(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PatchMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody Map<String, String> body) {
        UserResponse response = authService.updateProfile(userDetails.getId(), body.get("name"));
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/github")
    public ResponseEntity<ApiResponse<Map<String, String>>> githubAuthUrl(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        String url = gitHubOAuthService.getAuthorizationUrl(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(Map.of("url", url)));
    }

    @GetMapping("/github/callback")
    public ResponseEntity<ApiResponse<Void>> githubCallback(
            @RequestParam String code, @RequestParam String state) {
        gitHubOAuthService.handleCallback(code, state);
        return ResponseEntity.ok(ApiResponse.ok(null));
    }

    @DeleteMapping("/github")
    public ResponseEntity<ApiResponse<Void>> githubDisconnect(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        gitHubOAuthService.disconnect(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(null));
    }
}
